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

# Add parent directories to path for imports
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'ml-engine'))
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'data-aggregator'))

from ensemble_predictor import EnsemblePredictionEngine
from price_aggregator import PriceDataAggregator
from zk_integration import zk_integration

# Initialize FastAPI app
app = FastAPI(
    title="Apollon - ZK Oracle Price Oracle API",
    description="Zero-Knowledge Enhanced Price Prediction Oracle for Algorand",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global instances
predictor = EnsemblePredictionEngine()
data_aggregator = PriceDataAggregator()

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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

class TechnicalIndicatorsResponse(BaseModel):
    symbol: str
    indicators: Dict[str, float]
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
    zk_proof: Dict[str, Any]
    privacy_status: Dict[str, Any]
    status: str = "success"

# Global state
app_state = {
    "models_trained": False,
    "last_prediction": None,
    "training_in_progress": False
}

@app.on_event("startup")
async def startup_event():
    """Initialize the application on startup"""
    logger.info("Starting Apollon - ZK Oracle Price Oracle API...")
    
    # Start background training
    asyncio.create_task(initialize_models())

async def initialize_models():
    """Initialize and train ML models"""
    try:
        if app_state["training_in_progress"]:
            return
            
        app_state["training_in_progress"] = True
        logger.info("Fetching historical data for model training...")
        
        # Get historical data
        historical_data = await data_aggregator.fetch_historical_data(days=90)
        
        if historical_data and len(historical_data) > 100:
            logger.info(f"Training models with {len(historical_data)} data points...")
            await predictor.train_models(historical_data)
            app_state["models_trained"] = True
            logger.info("Model training completed successfully")
        else:
            logger.error("Insufficient historical data for training")
            
    except Exception as e:
        logger.error(f"Model initialization failed: {e}")
    finally:
        app_state["training_in_progress"] = False

@app.get("/", response_model=Dict)
async def root():
    """Root endpoint with API information"""
    return {
        "name": "Apollon - ZK Oracle Price Oracle API",
        "version": "1.0.0",
        "description": "Zero-Knowledge Enhanced Price Prediction Oracle for Algorand",
        "endpoints": {
            "health": "/health",
            "predict": "/predict",
            "predict_with_zk": "/predict-zk",
            "verify_zk_proof": "/verify-zk",
            "current_price": "/price/current",
            "technical_indicators": "/price/technicals",
            "historical": "/price/historical"
        }
    }

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy" if app_state["models_trained"] else "initializing",
        timestamp=datetime.now().isoformat(),
        models_trained=app_state["models_trained"],
        last_prediction=app_state.get("last_prediction")
    )

@app.post("/predict", response_model=PredictionResponse)
async def get_prediction(request: PredictionRequest):
    """Generate price prediction using ensemble ML models"""
    
    if not app_state["models_trained"]:
        if not app_state["training_in_progress"]:
            # Start training if not already in progress
            asyncio.create_task(initialize_models())
        raise HTTPException(
            status_code=503, 
            detail="Models are still training. Please try again in a few minutes."
        )
    
    try:
        logger.info(f"Generating prediction for {request.symbol}, timeframe: {request.timeframe}")
        
        # Get recent data for prediction
        recent_data = await data_aggregator.fetch_historical_data(days=30)
        
        if not recent_data or len(recent_data) < 20:
            raise HTTPException(
                status_code=503,
                detail="Insufficient recent data for prediction"
            )
        
        # Generate prediction
        prediction = await predictor.predict(recent_data, request.timeframe)
        
        # Update app state
        app_state["last_prediction"] = prediction["timestamp"]
        
        return PredictionResponse(**prediction)
        
    except Exception as e:
        logger.error(f"Prediction generation failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict-zk", response_model=ZKPredictionResponse)
async def get_prediction_with_zk_proof(request: PredictionRequest):
    """Generate price prediction with Zero-Knowledge proof for privacy"""
    
    if not app_state["models_trained"]:
        if not app_state["training_in_progress"]:
            asyncio.create_task(initialize_models())
        raise HTTPException(
            status_code=503, 
            detail="Models are still training. Please try again in a few minutes."
        )
    
    try:
        logger.info(f"Generating ZK prediction for {request.symbol}, timeframe: {request.timeframe}")
        
        # Get recent data for prediction
        recent_data = await data_aggregator.fetch_historical_data(days=30)
        
        if not recent_data or len(recent_data) < 20:
            raise HTTPException(
                status_code=503,
                detail="Insufficient recent data for prediction"
            )
        
        # Generate regular prediction first
        prediction = await predictor.predict(recent_data, request.timeframe)
        
        # Format prediction data for ZK proof
        zk_input = zk_integration.format_prediction_for_zk(prediction)
        
        # Generate ZK proof
        logger.info("Generating ZK proof for prediction...")
        zk_result = await zk_integration.generate_zk_proof(zk_input)
        
        # Create privacy-enhanced response
        zk_response = {
            **prediction,
            "zk_proof": zk_result.get("zk_proof", {}),
            "privacy_status": zk_result.get("privacy", {
                "model_weights_hidden": True,
                "individual_predictions_hidden": True,
                "circuit_verified": True
            })
        }
        
        # Update app state
        app_state["last_prediction"] = prediction["timestamp"]
        
        logger.info("ZK prediction with proof generated successfully")
        return ZKPredictionResponse(**zk_response)
        
    except Exception as e:
        logger.error(f"ZK prediction generation failed: {e}")
        raise HTTPException(status_code=500, detail=f"ZK prediction failed: {str(e)}")

@app.post("/verify-zk")
async def verify_zk_proof(proof_data: Dict[str, Any]):
    """Verify a Zero-Knowledge proof"""
    
    try:
        proof = proof_data.get("proof")
        public_signals = proof_data.get("public_signals", [])
        
        if not proof or not public_signals:
            raise HTTPException(
                status_code=400,
                detail="Invalid proof data. Required: 'proof' and 'public_signals'"
            )
        
        logger.info("Verifying ZK proof...")
        
        # Verify the proof
        verified = await zk_integration.verify_zk_proof(proof, public_signals)
        
        result = {
            "verified": verified,
            "timestamp": datetime.now().isoformat(),
            "public_signals": public_signals,
            "status": "valid" if verified else "invalid"
        }
        
        logger.info(f"ZK proof verification: {'PASSED' if verified else 'FAILED'}")
        return result
        
    except Exception as e:
        logger.error(f"ZK proof verification error: {e}")
        raise HTTPException(status_code=500, detail=f"Verification failed: {str(e)}")

@app.get("/price/current")
async def get_current_price():
    """Get current aggregated price from multiple sources"""
    try:
        price_data = await data_aggregator.get_aggregated_price()
        
        if not price_data:
            raise HTTPException(
                status_code=503,
                detail="Unable to fetch current price data"
            )
        
        return price_data
        
    except Exception as e:
        logger.error(f"Failed to fetch current price: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/price/technicals", response_model=TechnicalIndicatorsResponse)
async def get_technical_indicators():
    """Get technical indicators for current market data"""
    try:
        # Get recent historical data
        historical_data = await data_aggregator.fetch_historical_data(days=30)
        
        if not historical_data:
            raise HTTPException(
                status_code=503,
                detail="Unable to fetch historical data for technical analysis"
            )
        
        # Calculate technical indicators
        indicators = await data_aggregator.get_technical_indicators(historical_data)
        
        return TechnicalIndicatorsResponse(
            symbol="ALGOUSD",
            indicators=indicators,
            timestamp=datetime.now().isoformat()
        )
        
    except Exception as e:
        logger.error(f"Failed to calculate technical indicators: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/price/historical")
async def get_historical_data(days: int = 30):
    """Get historical price data"""
    if days > 365:
        raise HTTPException(
            status_code=400,
            detail="Maximum historical data period is 365 days"
        )
    
    try:
        historical_data = await data_aggregator.fetch_historical_data(days=days)
        
        if not historical_data:
            raise HTTPException(
                status_code=503,
                detail="Unable to fetch historical data"
            )
        
        return {
            "symbol": "ALGOUSD",
            "period_days": days,
            "data_points": len(historical_data),
            "data": historical_data,
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Failed to fetch historical data: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/models/retrain")
async def retrain_models(background_tasks: BackgroundTasks):
    """Trigger model retraining (admin endpoint)"""
    if app_state["training_in_progress"]:
        raise HTTPException(
            status_code=409,
            detail="Model training already in progress"
        )
    
    # Start retraining in background
    background_tasks.add_task(initialize_models)
    
    return {
        "message": "Model retraining started",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/models/status")
async def get_model_status():
    """Get model training and performance status"""
    try:
        status = {
            "models_trained": app_state["models_trained"],
            "training_in_progress": app_state["training_in_progress"],
            "last_prediction": app_state.get("last_prediction"),
            "model_weights": predictor.model_weights if app_state["models_trained"] else {},
            "prediction_history_count": len(predictor.prediction_history) if app_state["models_trained"] else 0
        }
        
        return status
        
    except Exception as e:
        logger.error(f"Failed to get model status: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "server:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )