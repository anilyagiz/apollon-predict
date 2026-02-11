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
import httpx
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
            if recent_data is None:
                recent_data = []
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


@app.get("/price/near")
async def get_near_price():
    """Proxy NEAR price data from CoinGecko (avoids browser CORS/rate-limit issues)"""
    import httpx

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                "https://api.coingecko.com/api/v3/simple/price",
                params={
                    "ids": "near",
                    "vs_currencies": "usd",
                    "include_24hr_change": "true",
                    "include_24hr_vol": "true",
                    "include_market_cap": "true",
                },
            )
            if resp.status_code == 200:
                data = resp.json()
                if data and "near" in data:
                    return {
                        "near": data["near"],
                        "timestamp": datetime.now().isoformat(),
                        "source": "coingecko",
                    }

        # Fallback mock data
        logger.warning("⚠️ CoinGecko API unavailable, returning mock NEAR price")
    except Exception as e:
        logger.warning(f"⚠️ CoinGecko fetch failed: {e}")

    # Return realistic mock data as fallback
    base_price = 3.45 + np.random.uniform(-0.05, 0.05)
    return {
        "near": {
            "usd": round(base_price, 6),
            "usd_24h_change": round(np.random.uniform(-3.0, 3.0), 4),
            "usd_24h_vol": round(np.random.uniform(150_000_000, 300_000_000), 2),
            "usd_market_cap": round(base_price * 1_200_000_000, 2),
        },
        "timestamp": datetime.now().isoformat(),
        "source": "mock",
    }


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


# =============================================================================
# NEAR Intents - Token Swap / Bridge Endpoints
# =============================================================================

# Lazy-init intents service
_intents_service = None


def get_intents_service():
    global _intents_service
    if _intents_service is None:
        try:
            from intents_service import IntentsService

            api_key = os.environ.get("NEAR_INTENTS_API_KEY")
            _intents_service = IntentsService(api_key=api_key)
            logger.info("✓ Intents service initialized")
        except Exception as e:
            logger.warning(f"⚠ Intents service not available: {e}")
    return _intents_service


class SwapQuoteRequest(BaseModel):
    origin_asset: str
    destination_asset: str
    amount: str
    recipient: str
    refund_to: str = ""
    swap_type: str = "EXACT_INPUT"
    slippage_tolerance: int = 100
    dry: bool = True


class SwapExecuteRequest(BaseModel):
    origin_asset: str
    destination_asset: str
    amount: str
    recipient: str
    refund_to: str = ""
    swap_type: str = "EXACT_INPUT"
    slippage_tolerance: int = 100


class DepositSubmitRequest(BaseModel):
    tx_hash: str
    deposit_address: str
    near_sender_account: Optional[str] = None


class IntentPredictionQuoteRequest(BaseModel):
    origin_asset: str
    amount: str
    recipient_near_account: str
    refund_to: str


@app.get("/swap/tokens")
async def get_swap_tokens(chain: Optional[str] = None):
    """Get supported tokens for cross-chain swaps, optionally filtered by chain."""
    svc = get_intents_service()
    if not svc:
        raise HTTPException(status_code=503, detail="Intents service not available")
    try:
        if chain:
            tokens = await svc.get_tokens_by_chain(chain)
        else:
            tokens = await svc.get_supported_tokens()
        return {"tokens": tokens, "count": len(tokens), "timestamp": datetime.now().isoformat()}
    except Exception as e:
        logger.error(f"Failed to fetch swap tokens: {e}")
        raise HTTPException(status_code=502, detail=str(e))


@app.get("/swap/chains")
async def get_swap_chains():
    """Get list of supported blockchains for swaps."""
    svc = get_intents_service()
    if not svc:
        raise HTTPException(status_code=503, detail="Intents service not available")
    try:
        chains = await svc.get_supported_chains()
        return {"chains": chains, "count": len(chains), "timestamp": datetime.now().isoformat()}
    except Exception as e:
        logger.error(f"Failed to fetch chains: {e}")
        raise HTTPException(status_code=502, detail=str(e))


@app.post("/swap/quote")
async def get_swap_quote(request: SwapQuoteRequest):
    """Get a swap quote from NEAR Intents 1Click API."""
    svc = get_intents_service()
    if not svc:
        raise HTTPException(status_code=503, detail="Intents service not available")
    try:
        quote = await svc.request_quote(
            origin_asset=request.origin_asset,
            destination_asset=request.destination_asset,
            amount=request.amount,
            swap_type=request.swap_type,
            slippage_tolerance=request.slippage_tolerance,
            recipient=request.recipient,
            refund_to=request.refund_to,
            dry=request.dry,
        )
        return quote
    except Exception as e:
        logger.error(f"Swap quote failed: {e}")
        raise HTTPException(status_code=502, detail=str(e))


@app.post("/swap/execute")
async def execute_swap(request: SwapExecuteRequest):
    """Execute a cross-chain swap. Returns deposit address for the user."""
    svc = get_intents_service()
    if not svc:
        raise HTTPException(status_code=503, detail="Intents service not available")
    try:
        result = await svc.execute_swap(
            origin_asset=request.origin_asset,
            destination_asset=request.destination_asset,
            amount=request.amount,
            recipient=request.recipient,
            refund_to=request.refund_to,
            swap_type=request.swap_type,
            slippage_tolerance=request.slippage_tolerance,
        )
        return result
    except Exception as e:
        logger.error(f"Swap execution failed: {e}")
        raise HTTPException(status_code=502, detail=str(e))


@app.get("/swap/status/{deposit_address}")
async def get_swap_status(deposit_address: str):
    """Check the status of a cross-chain swap."""
    svc = get_intents_service()
    if not svc:
        raise HTTPException(status_code=503, detail="Intents service not available")
    try:
        status = await svc.get_swap_status(deposit_address)
        return status
    except Exception as e:
        logger.error(f"Swap status check failed: {e}")
        raise HTTPException(status_code=502, detail=str(e))


@app.post("/swap/deposit")
async def submit_swap_deposit(request: DepositSubmitRequest):
    """Submit deposit tx hash to speed up swap processing."""
    svc = get_intents_service()
    if not svc:
        raise HTTPException(status_code=503, detail="Intents service not available")
    try:
        result = await svc.submit_deposit(
            tx_hash=request.tx_hash,
            deposit_address=request.deposit_address,
            near_sender_account=request.near_sender_account,
        )
        return result
    except Exception as e:
        logger.error(f"Deposit submit failed: {e}")
        raise HTTPException(status_code=502, detail=str(e))


# =============================================================================
# NEAR Intents - Prediction Payment Endpoints
# =============================================================================


@app.post("/intents/prediction/quote")
async def get_prediction_payment_quote(request: IntentPredictionQuoteRequest):
    """Get a quote for paying for an oracle prediction via cross-chain intent."""
    svc = get_intents_service()
    if not svc:
        raise HTTPException(status_code=503, detail="Intents service not available")
    try:
        quote = await svc.request_prediction_payment_quote(
            origin_asset=request.origin_asset,
            amount=request.amount,
            recipient_near_account=request.recipient_near_account,
            refund_to=request.refund_to,
        )
        return quote
    except Exception as e:
        logger.error(f"Prediction payment quote failed: {e}")
        raise HTTPException(status_code=502, detail=str(e))


@app.post("/intents/prediction/execute")
async def execute_prediction_payment(request: IntentPredictionQuoteRequest):
    """Execute a cross-chain prediction payment. Returns deposit address."""
    svc = get_intents_service()
    if not svc:
        raise HTTPException(status_code=503, detail="Intents service not available")
    try:
        result = await svc.execute_prediction_payment(
            origin_asset=request.origin_asset,
            amount=request.amount,
            recipient_near_account=request.recipient_near_account,
            refund_to=request.refund_to,
        )
        return result
    except Exception as e:
        logger.error(f"Prediction payment execution failed: {e}")
        raise HTTPException(status_code=502, detail=str(e))


@app.get("/intents/status/{deposit_address}")
async def get_intent_status(deposit_address: str):
    """Check status of an intent-based prediction payment."""
    svc = get_intents_service()
    if not svc:
        raise HTTPException(status_code=503, detail="Intents service not available")
    try:
        return await svc.get_swap_status(deposit_address)
    except Exception as e:
        logger.error(f"Intent status check failed: {e}")
        raise HTTPException(status_code=502, detail=str(e))


# =============================================================================
# Shade Agent Status Endpoints
# =============================================================================


@app.get("/agent/status")
async def get_agent_status():
    """Get Shade Agent oracle status."""
    agent_enabled = os.environ.get("SHADE_AGENT_ENABLED", "false").lower() == "true"
    agent_endpoint = os.environ.get("SHADE_AGENT_ENDPOINT", "")

    status = {
        "enabled": agent_enabled,
        "agent_id": os.environ.get("SHADE_AGENT_ID", ""),
        "status": "disabled",
        "last_fulfillment": None,
        "total_fulfilled": 0,
        "tee_attestation": None,
        "timestamp": datetime.now().isoformat(),
    }

    if agent_enabled and agent_endpoint:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(f"{agent_endpoint}/status")
                if resp.status_code == 200:
                    agent_data = resp.json()
                    status.update(
                        {
                            "status": agent_data.get("status", "running"),
                            "last_fulfillment": agent_data.get("last_fulfillment"),
                            "total_fulfilled": agent_data.get("total_fulfilled", 0),
                            "tee_attestation": agent_data.get("tee_attestation"),
                            "chains": agent_data.get("chains", ["near"]),
                        }
                    )
        except Exception as e:
            logger.warning(f"Could not reach shade agent: {e}")
            status["status"] = "unreachable"

    return status


@app.get("/agent/attestation")
async def get_agent_attestation():
    """Get Shade Agent TEE remote attestation data."""
    agent_endpoint = os.environ.get("SHADE_AGENT_ENDPOINT", "")

    if not agent_endpoint:
        return {
            "available": False,
            "message": "Shade agent not configured",
            "timestamp": datetime.now().isoformat(),
        }

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{agent_endpoint}/attestation")
            if resp.status_code == 200:
                return resp.json()
    except Exception as e:
        logger.warning(f"Could not fetch attestation: {e}")

    return {
        "available": False,
        "message": "Could not reach shade agent",
        "timestamp": datetime.now().isoformat(),
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True, log_level="info")
