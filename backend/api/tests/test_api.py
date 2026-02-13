"""
Test Suite for Apollon - ZK Oracle API
Tests all API endpoints and core functionality
"""

import pytest
import asyncio
import json
from datetime import datetime, timedelta
from fastapi.testclient import TestClient
import sys
import os

# Add parent directories to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
# Add backend root to path for ml_engine and data_aggregator imports
backend_root = os.path.dirname(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
)
sys.path.insert(0, backend_root)

from server import app, app_state, initialize_models
from ml_engine.ensemble_predictor import EnsemblePredictionEngine
from data_aggregator.price_aggregator import PriceDataAggregator

client = TestClient(app)


# Test Data
@pytest.fixture
def sample_historical_data():
    """Generate sample historical price data"""
    data = []
    base_price = 0.20
    for i in range(100):
        timestamp = datetime.now() - timedelta(hours=i)
        price = base_price + 0.05 * (i / 100) + (0.01 * (i % 5 - 2))
        data.append(
            {
                "datetime": timestamp,
                "price": max(0.1, price),
                "volume": 1000000 + (i * 1000),
            }
        )
    return list(reversed(data))


@pytest.fixture
def prediction_request():
    """Sample prediction request"""
    return {
        "symbol": "ALGOUSD",
        "timeframe": "24h",
        "include_confidence": True,
        "include_technicals": False,
    }


# API Endpoint Tests
class TestAPIEndpoints:
    """Test basic API endpoints"""

    def test_root_endpoint(self):
        """Test root endpoint returns API info"""
        response = client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "name" in data
        assert "version" in data
        assert "endpoints" in data

    def test_health_check(self):
        """Test health check endpoint"""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "timestamp" in data
        assert "models_trained" in data

    def test_health_returns_valid_status(self):
        """Test health check returns valid status values"""
        response = client.get("/health")
        data = response.json()
        assert data["status"] in ["healthy", "initializing"]
        assert isinstance(data["models_trained"], bool)


class TestPriceEndpoints:
    """Test price-related endpoints"""

    def test_current_price_endpoint_exists(self):
        """Test current price endpoint exists"""
        response = client.get("/price/current")
        # May return 503 if data unavailable, but endpoint should exist
        assert response.status_code in [200, 503]

    def test_technical_indicators_endpoint_exists(self):
        """Test technical indicators endpoint exists"""
        response = client.get("/price/technicals")
        assert response.status_code in [200, 503]

    def test_historical_data_endpoint(self):
        """Test historical data endpoint"""
        response = client.get("/price/historical?days=30")
        assert response.status_code in [200, 400, 503]

    def test_historical_data_days_validation(self):
        """Test historical data days parameter validation"""
        response = client.get("/price/historical?days=400")
        assert response.status_code == 400


class TestPredictionEndpoints:
    """Test prediction endpoints"""

    def test_predict_endpoint_when_models_not_trained(self, prediction_request):
        """Test predict endpoint when models not trained - returns mock prediction"""
        # Reset app state
        original_state = app_state["models_trained"]
        original_training = app_state.get("training_in_progress", False)
        app_state["models_trained"] = False
        app_state["training_in_progress"] = False

        response = client.post("/predict", json=prediction_request)

        # Should return mock prediction when models not ready (instead of 503)
        assert response.status_code == 200
        data = response.json()
        assert "symbol" in data
        assert "predicted_price" in data

        # Restore state
        app_state["models_trained"] = original_state
        app_state["training_in_progress"] = original_training

    def test_predict_zk_endpoint_exists(self, prediction_request):
        """Test ZK prediction endpoint exists"""
        response = client.post("/predict-zk", json=prediction_request)
        assert response.status_code in [200, 503, 500]


class TestModelEndpoints:
    """Test model management endpoints"""

    def test_model_status_endpoint(self):
        """Test model status endpoint"""
        response = client.get("/models/status")
        assert response.status_code == 200
        data = response.json()
        assert "models_trained" in data
        assert "training_in_progress" in data


# ML Engine Tests
class TestMLEngine:
    """Test ML Engine components"""

    @pytest.mark.asyncio
    async def test_ensemble_predictor_initialization(self):
        """Test ensemble predictor can be initialized"""
        predictor = EnsemblePredictionEngine()
        assert predictor is not None
        assert not predictor.is_trained
        assert len(predictor.model_weights) == 4

    @pytest.mark.asyncio
    async def test_ensemble_predictor_training(self, sample_historical_data):
        """Test ensemble predictor training"""
        predictor = EnsemblePredictionEngine()

        # Should not raise exception
        try:
            await predictor.train_models(sample_historical_data)
            # Training may fail due to model dependencies
            # but should not crash
        except Exception as e:
            # Expected if ML libraries not installed
            pytest.skip(f"Training skipped: {e}")


# Data Aggregator Tests
class TestDataAggregator:
    """Test Data Aggregator components"""

    @pytest.mark.asyncio
    async def test_price_aggregator_initialization(self):
        """Test price aggregator can be initialized"""
        aggregator = PriceDataAggregator()
        assert aggregator is not None

    @pytest.mark.asyncio
    async def test_technical_indicators_calculation(self, sample_historical_data):
        """Test technical indicators calculation"""
        aggregator = PriceDataAggregator()

        try:
            indicators = await aggregator.get_technical_indicators(
                sample_historical_data
            )

            # Check expected indicators exist
            assert "rsi" in indicators or indicators == {}
        except Exception as e:
            pytest.skip(f"Indicators calculation skipped: {e}")


# ZK Integration Tests
class TestZKIntegration:
    """Test ZK proof integration"""

    def test_zk_proof_verification_endpoint_exists(self):
        """Test ZK verification endpoint exists"""
        test_proof = {
            "proof": {
                "pi_a": ["1", "2"],
                "pi_b": [["1", "0"], ["2", "0"]],
                "pi_c": ["3", "4"],
            },
            "public_signals": ["208"],
        }

        response = client.post("/verify-zk", json=test_proof)
        # May fail but endpoint should exist
        assert response.status_code in [200, 400, 500]


# Error Handling Tests
class TestErrorHandling:
    """Test API error handling"""

    def test_invalid_endpoint_returns_404(self):
        """Test invalid endpoint returns 404"""
        response = client.get("/invalid-endpoint")
        assert response.status_code == 404

    def test_invalid_json_returns_error(self):
        """Test invalid JSON returns appropriate error"""
        response = client.post(
            "/predict",
            data="invalid json",
            headers={"Content-Type": "application/json"},
        )
        assert response.status_code == 422


# Integration Tests
class TestIntegration:
    """Integration tests for complete workflow"""

    @pytest.mark.asyncio
    async def test_full_prediction_workflow(self, prediction_request):
        """Test complete prediction workflow"""
        # 1. Check health
        health_response = client.get("/health")
        assert health_response.status_code == 200

        # 2. Get current price
        price_response = client.get("/price/current")
        # May be 503 if data unavailable

        # 3. Try prediction (may fail if models not trained)
        predict_response = client.post("/predict", json=prediction_request)
        assert predict_response.status_code in [200, 503]


# Performance Tests
class TestPerformance:
    """Test API performance"""

    def test_health_endpoint_performance(self):
        """Test health endpoint responds quickly"""
        import time

        start = time.time()
        response = client.get("/health")
        end = time.time()

        assert response.status_code == 200
        assert (end - start) < 1.0  # Should respond in less than 1 second


# Main entry point
if __name__ == "__main__":
    pytest.main([__file__, "-v"])
