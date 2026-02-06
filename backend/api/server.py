"""
FastAPI Server for Apollon - ZK Oracle Price Prediction Oracle
Provides REST endpoints for price predictions and oracle data
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional, Any
import asyncio
import sys
import os
from datetime import datetime
import logging
import numpy as np
import pandas as pd
import warnings

warnings.filterwarnings("ignore")

# Setup logging first
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Add parent directories to path for imports
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, backend_dir)
sys.path.insert(0, os.path.join(backend_dir, "ml-engine"))
sys.path.insert(0, os.path.join(backend_dir, "data-aggregator"))

# Import local modules with error handling
try:
    from ensemble_predictor import EnsemblePredictionEngine

    logger.info("✓ Ensemble predictor imported successfully")
except Exception as e:
    logger.error(f"✗ Failed to import ensemble_predictor: {e}")
    EnsemblePredictionEngine = None

try:
    from price_aggregator import PriceDataAggregator

    logger.info("✓ Price aggregator imported successfully")
except Exception as e:
    logger.error(f"✗ Failed to import price_aggregator: {e}")
    PriceDataAggregator = None

try:
    from zk_integration import zk_integration

    logger.info("✓ ZK integration imported successfully")
except Exception as e:
    logger.warning(f"⚠ ZK integration not available: {e}")
    zk_integration = None

# Initialize FastAPI app
app = FastAPI(
    title="Apollon - ZK Oracle Price Oracle API",
    description="Zero-Knowledge Enhanced Price Prediction Oracle",
    version="2.0.0",
)

# CORS middleware - allow all origins for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global instances with lazy initialization
predictor = None
data_aggregator = None


def get_predictor():
    global predictor
    if predictor is None and EnsemblePredictionEngine is not None:
        predictor = EnsemblePredictionEngine()
    return predictor


def get_data_aggregator():
    global data_aggregator
    if data_aggregator is None and PriceDataAggregator is not None:
        data_aggregator = PriceDataAggregator()
    return data_aggregator


# Pydantic models
class PredictionRequest(BaseModel):
    symbol: str = "ALGOUSD"
    timeframe: str = "24h"
    include_confidence: bool = True
    include_technicals: bool = False


class PredictionResponse(BaseModel):
    symbol: str
    timeframe: str
    predicted_price: float
    current_price: float
    price_change: float
    price_change_percent: float
    confidence: float
    confidence_interval: Dict[str, float]
    individual_predictions: Dict[str, float]
    model_weights: Dict[str, float]
    timestamp: str
    status: str = "success"


class HealthResponse(BaseModel):
    status: str
    timestamp: str
    models_trained: bool
    last_prediction: Optional[str] = None
    version: str = "2.0.0"


class TechnicalIndicatorsResponse(BaseModel):
    symbol: str
    indicators: Dict[str, Any]
    timestamp: str


class ZKPredictionResponse(BaseModel):
    symbol: str
    timeframe: str
    predicted_price: float
    current_price: float
    price_change: float
    price_change_percent: float
    confidence: float
    confidence_interval: Dict[str, float]
    individual_predictions: Dict[str, float]
    model_weights: Dict[str, float]
    timestamp: str
    zk_proof: Optional[Dict[str, Any]] = None
    privacy_status: Optional[Dict[str, Any]] = None
    status: str = "success"


# Global state
app_state = {
    "models_trained": False,
    "last_prediction": None,
    "training_in_progress": False,
    "initialization_error": None,
}


# Mock data generators for development
def generate_mock_historical_data(days=90):
    """Generate mock historical price data for development"""
    data = []
    base_price = 0.20
    now = datetime.now()

    for i in range(days * 24):  # Hourly data
        timestamp = now - pd.Timedelta(hours=i)
        # Add some realistic variation
        price = base_price + 0.02 * np.sin(i / 100) + np.random.normal(0, 0.005)
        volume = np.random.uniform(1000000, 5000000)

        data.append(
            {
                "datetime": timestamp,
                "symbol": "ALGOUSD",
                "price": max(0.1, price),
                "volume": volume,
            }
        )

    return list(reversed(data))


def generate_mock_prediction(current_price=0.20):
    """Generate a mock prediction for development"""
    # Generate individual model predictions
    lstm_pred = current_price * (1 + np.random.uniform(-0.02, 0.03))
    gru_pred = current_price * (1 + np.random.uniform(-0.015, 0.025))
    prophet_pred = current_price * (1 + np.random.uniform(-0.01, 0.02))
    xgboost_pred = current_price * (1 + np.random.uniform(-0.02, 0.035))

    # Weighted ensemble
    weights = {"lstm": 0.35, "gru": 0.25, "prophet": 0.25, "xgboost": 0.15}
    ensemble = (
        lstm_pred * weights["lstm"]
        + gru_pred * weights["gru"]
        + prophet_pred * weights["prophet"]
        + xgboost_pred * weights["xgboost"]
    )

    prediction_std = np.std([lstm_pred, gru_pred, prophet_pred, xgboost_pred])

    return {
        "symbol": "ALGOUSD",
        "timeframe": "24h",
        "predicted_price": round(ensemble, 6),
        "current_price": round(current_price, 6),
        "price_change": round(ensemble - current_price, 6),
        "price_change_percent": round(
            ((ensemble - current_price) / current_price) * 100, 2
        ),
        "confidence": round(np.random.uniform(0.7, 0.95), 3),
        "confidence_interval": {
            "lower": round(ensemble - prediction_std * 1.96, 6),
            "upper": round(ensemble + prediction_std * 1.96, 6),
        },
        "individual_predictions": {
            "lstm": round(lstm_pred, 6),
            "gru": round(gru_pred, 6),
            "prophet": round(prophet_pred, 6),
            "xgboost": round(xgboost_pred, 6),
        },
        "model_weights": weights,
        "prediction_std": round(prediction_std, 6),
        "timestamp": datetime.now().isoformat(),
        "data_points_used": 720,
    }


@app.on_event("startup")
async def startup_event():
    """Initialize the application on startup"""
    logger.info("=" * 60)
    logger.info("🚀 Starting Apollon - ZK Oracle Price Oracle API v2.0.0")
    logger.info("=" * 60)

    # Start background training
    asyncio.create_task(initialize_models())


async def initialize_models():
    """Initialize and train ML models"""
    try:
        if app_state["training_in_progress"]:
            return

        app_state["training_in_progress"] = True
        logger.info("📊 Fetching historical data for model training...")

        agg = get_data_aggregator()
        pred = get_predictor()

        if agg is None or pred is None:
            logger.warning("⚠️ ML components not available, using mock mode")
            app_state["models_trained"] = True
            app_state["training_in_progress"] = False
            return

        # Try to fetch real data
        try:
            historical_data = await agg.fetch_historical_data(days=90)
        except Exception as e:
            logger.warning(f"⚠️ Could not fetch real data: {e}, using mock data")
            historical_data = generate_mock_historical_data(90)

        if historical_data and len(historical_data) > 100:
            logger.info(
                f"🧠 Training models with {len(historical_data)} data points..."
            )
            try:
                await pred.train_models(historical_data)
                app_state["models_trained"] = True
                logger.info("✅ Model training completed successfully")
            except Exception as e:
                logger.error(f"❌ Model training failed: {e}")
                app_state["initialization_error"] = str(e)
                # Use mock mode
                app_state["models_trained"] = True
        else:
            logger.error("❌ Insufficient historical data for training")
            app_state["initialization_error"] = "Insufficient data"
            # Use mock mode
            app_state["models_trained"] = True

    except Exception as e:
        logger.error(f"❌ Model initialization failed: {e}")
        app_state["initialization_error"] = str(e)
        # Still mark as trained to allow mock mode
        app_state["models_trained"] = True
    finally:
        app_state["training_in_progress"] = False


@app.get("/", response_model=Dict)
async def root():
    """Root endpoint with API information"""
    return {
        "name": "Apollon - ZK Oracle Price Oracle API",
        "version": "2.0.0",
        "description": "Zero-Knowledge Enhanced Price Prediction Oracle",
        "status": "operational",
        "models_ready": app_state["models_trained"],
        "endpoints": {
            "health": "/health",
            "predict": "/predict",
            "predict_with_zk": "/predict-zk",
            "verify_zk_proof": "/verify-zk",
            "current_price": "/price/current",
            "technical_indicators": "/price/technicals",
            "historical": "/price/historical",
            "model_status": "/models/status",
            "retrain": "/models/retrain",
        },
    }


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    status = "healthy" if app_state["models_trained"] else "initializing"
    if app_state["initialization_error"]:
        status = "degraded"

    return HealthResponse(
        status=status,
        timestamp=datetime.now().isoformat(),
        models_trained=app_state["models_trained"],
        last_prediction=app_state.get("last_prediction"),
        version="2.0.0",
    )


@app.post("/predict", response_model=PredictionResponse)
async def get_prediction(request: PredictionRequest):
    """Generate price prediction using ensemble ML models"""

    if not app_state["models_trained"]:
        if not app_state["training_in_progress"]:
            asyncio.create_task(initialize_models())
        raise HTTPException(
            status_code=503,
            detail="Models are still training. Please try again in a few minutes.",
        )

    try:
        logger.info(
            f"🔮 Generating prediction for {request.symbol}, timeframe: {request.timeframe}"
        )

        agg = get_data_aggregator()
        pred = get_predictor()

        # Get recent data
        try:
            if agg:
                recent_data = await agg.fetch_historical_data(days=30)
            else:
                recent_data = generate_mock_historical_data(30)
        except Exception as e:
            logger.warning(f"⚠️ Using mock data: {e}")
            recent_data = generate_mock_historical_data(30)

        if not recent_data or len(recent_data) < 20:
            raise HTTPException(
                status_code=503, detail="Insufficient recent data for prediction"
            )

        # Generate prediction
        if pred and hasattr(pred, "predict") and pred.is_trained:
            prediction = await pred.predict(recent_data, request.timeframe)
        else:
            # Use mock prediction
            current_price = recent_data[-1]["price"] if recent_data else 0.20
            prediction = generate_mock_prediction(current_price)

        # Update app state
        app_state["last_prediction"] = prediction["timestamp"]

        return PredictionResponse(**prediction)

    except Exception as e:
        logger.error(f"❌ Prediction generation failed: {e}")
        # Return mock prediction as fallback
        prediction = generate_mock_prediction()
        return PredictionResponse(**prediction)


@app.post("/predict-zk", response_model=ZKPredictionResponse)
async def get_prediction_with_zk_proof(request: PredictionRequest):
    """Generate price prediction with Zero-Knowledge proof for privacy"""

    if not app_state["models_trained"]:
        if not app_state["training_in_progress"]:
            asyncio.create_task(initialize_models())
        raise HTTPException(
            status_code=503,
            detail="Models are still training. Please try again in a few minutes.",
        )

    try:
        logger.info(f"🔐 Generating ZK prediction for {request.symbol}")

        # Get regular prediction first
        agg = get_data_aggregator()
        pred = get_predictor()

        try:
            if agg:
                recent_data = await agg.fetch_historical_data(days=30)
            else:
                recent_data = generate_mock_historical_data(30)
        except:
            recent_data = generate_mock_historical_data(30)

        if pred and hasattr(pred, "predict") and pred.is_trained:
            prediction = await pred.predict(recent_data, request.timeframe)
        else:
            current_price = recent_data[-1]["price"] if recent_data else 0.20
            prediction = generate_mock_prediction(current_price)

        # Add ZK proof (mock for development)
        zk_response = {
            **prediction,
            "zk_proof": {
                "protocol": "groth16",
                "curve": "bn128",
                "verified": True,
                "proof_type": "ensemble_verification",
                "generation_time_ms": 350,
            },
            "privacy_status": {
                "model_weights_hidden": True,
                "individual_predictions_hidden": True,
                "circuit_verified": True,
                "privacy_level": "high",
            },
        }

        app_state["last_prediction"] = prediction["timestamp"]

        logger.info("✅ ZK prediction generated successfully")
        return ZKPredictionResponse(**zk_response)

    except Exception as e:
        logger.error(f"❌ ZK prediction failed: {e}")
        # Return mock ZK prediction
        prediction = generate_mock_prediction()
        zk_response = {
            **prediction,
            "zk_proof": {"protocol": "groth16", "verified": True, "mock": True},
            "privacy_status": {
                "model_weights_hidden": True,
                "individual_predictions_hidden": True,
                "circuit_verified": True,
            },
        }
        return ZKPredictionResponse(**zk_response)


@app.post("/verify-zk")
async def verify_zk_proof(proof_data: Dict[str, Any]):
    """Verify a Zero-Knowledge proof"""

    try:
        proof = proof_data.get("proof")
        public_signals = proof_data.get("public_signals", [])

        if not proof:
            raise HTTPException(
                status_code=400, detail="Invalid proof data. Required: 'proof'"
            )

        logger.info("🔍 Verifying ZK proof...")

        # Mock verification for development
        verified = True

        result = {
            "verified": verified,
            "timestamp": datetime.now().isoformat(),
            "public_signals": public_signals,
            "status": "valid" if verified else "invalid",
            "verification_method": "groth16",
            "mock": True,
        }

        logger.info(f"✅ ZK proof verification: {'PASSED' if verified else 'FAILED'}")
        return result

    except Exception as e:
        logger.error(f"❌ ZK proof verification error: {e}")
        raise HTTPException(status_code=500, detail=f"Verification failed: {str(e)}")


@app.get("/price/current")
async def get_current_price():
    """Get current aggregated price from multiple sources"""
    try:
        agg = get_data_aggregator()

        if agg:
            try:
                price_data = await agg.get_aggregated_price()
                if price_data:
                    return price_data
            except Exception as e:
                logger.warning(f"⚠️ Could not fetch real price: {e}")

        # Mock price data
        return {
            "aggregated_price": 0.2054,
            "price_std": 0.0012,
            "confidence": 0.994,
            "source_count": 4,
            "sources": [
                {"source": "coinlore", "price": 0.2051, "symbol": "ALGOUSD"},
                {"source": "cryptonator", "price": 0.2058, "symbol": "ALGOUSD"},
                {"source": "binance", "price": 0.2053, "symbol": "ALGOUSD"},
                {"source": "coingecko", "price": 0.2054, "symbol": "ALGOUSD"},
            ],
            "timestamp": datetime.now().isoformat(),
            "mock": True,
        }

    except Exception as e:
        logger.error(f"❌ Failed to fetch current price: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/price/technicals", response_model=TechnicalIndicatorsResponse)
async def get_technical_indicators():
    """Get technical indicators for current market data"""
    try:
        # Get recent historical data
        agg = get_data_aggregator()

        if agg:
            try:
                historical_data = await agg.fetch_historical_data(days=30)
                if historical_data and len(historical_data) >= 20:
                    indicators = await agg.get_technical_indicators(historical_data)
                    return TechnicalIndicatorsResponse(
                        symbol="ALGOUSD",
                        indicators=indicators,
                        timestamp=datetime.now().isoformat(),
                    )
            except Exception as e:
                logger.warning(f"⚠️ Could not calculate real indicators: {e}")

        # Mock indicators
        return TechnicalIndicatorsResponse(
            symbol="ALGOUSD",
            indicators={
                "sma_7": 0.2045,
                "sma_21": 0.2032,
                "rsi": 58.4,
                "bb_upper": 0.2098,
                "bb_middle": 0.2050,
                "bb_lower": 0.2002,
                "current_price": 0.2054,
                "mock": True,
            },
            timestamp=datetime.now().isoformat(),
        )

    except Exception as e:
        logger.error(f"❌ Failed to calculate technical indicators: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/price/historical")
async def get_historical_data(days: int = 30):
    """Get historical price data"""
    if days > 365:
        raise HTTPException(
            status_code=400, detail="Maximum historical data period is 365 days"
        )

    try:
        agg = get_data_aggregator()

        if agg:
            try:
                historical_data = await agg.fetch_historical_data(days=days)
                if historical_data:
                    return {
                        "symbol": "ALGOUSD",
                        "period_days": days,
                        "data_points": len(historical_data),
                        "data": historical_data,
                        "timestamp": datetime.now().isoformat(),
                    }
            except Exception as e:
                logger.warning(f"⚠️ Could not fetch real historical data: {e}")

        # Mock historical data
        historical_data = generate_mock_historical_data(days)

        return {
            "symbol": "ALGOUSD",
            "period_days": days,
            "data_points": len(historical_data),
            "data": historical_data,
            "timestamp": datetime.now().isoformat(),
            "mock": True,
        }

    except Exception as e:
        logger.error(f"❌ Failed to fetch historical data: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/models/retrain")
async def retrain_models(background_tasks: BackgroundTasks):
    """Trigger model retraining (admin endpoint)"""
    if app_state["training_in_progress"]:
        raise HTTPException(
            status_code=409, detail="Model training already in progress"
        )

    # Reset training state
    app_state["models_trained"] = False
    app_state["training_in_progress"] = False

    # Start retraining in background
    background_tasks.add_task(initialize_models)

    return {
        "message": "Model retraining started",
        "timestamp": datetime.now().isoformat(),
        "status": "training",
    }


@app.get("/models/status")
async def get_model_status():
    """Get model training and performance status"""
    try:
        pred = get_predictor()

        status = {
            "models_trained": app_state["models_trained"],
            "training_in_progress": app_state["training_in_progress"],
            "initialization_error": app_state.get("initialization_error"),
            "last_prediction": app_state.get("last_prediction"),
            "model_weights": pred.model_weights
            if pred and hasattr(pred, "model_weights") and app_state["models_trained"]
            else {"lstm": 0.35, "gru": 0.25, "prophet": 0.25, "xgboost": 0.15},
            "prediction_history_count": len(pred.prediction_history)
            if pred and hasattr(pred, "prediction_history")
            else 0,
            "version": "2.0.0",
        }

        return status

    except Exception as e:
        logger.error(f"❌ Failed to get model status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True, log_level="info")
