"""
Type definitions for Apollon - ZK Oracle Price Oracle SDK
"""

from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime


class PredictionRequest(BaseModel):
    """Request model for price predictions"""
    symbol: str = Field(default="ALGOUSD", description="Trading symbol")
    timeframe: str = Field(default="24h", description="Prediction timeframe")
    include_confidence: bool = Field(default=True, description="Include confidence intervals")
    include_technicals: bool = Field(default=False, description="Include technical indicators")


class ConfidenceInterval(BaseModel):
    """Confidence interval for predictions"""
    lower: float = Field(description="Lower bound of confidence interval")
    upper: float = Field(description="Upper bound of confidence interval")


class IndividualPredictions(BaseModel):
    """Individual model predictions"""
    lstm: float = Field(description="LSTM model prediction")
    gru: float = Field(description="GRU model prediction") 
    prophet: float = Field(description="Prophet model prediction")
    xgboost: float = Field(description="XGBoost model prediction")


class ModelWeights(BaseModel):
    """Model ensemble weights"""
    model_config = ConfigDict(protected_namespaces=())
    
    lstm: float = Field(description="LSTM model weight")
    gru: float = Field(description="GRU model weight")
    prophet: float = Field(description="Prophet model weight")
    xgboost: float = Field(description="XGBoost model weight")


class PredictionResponse(BaseModel):
    """Response model for price predictions"""
    symbol: str = Field(description="Trading symbol")
    timeframe: str = Field(description="Prediction timeframe")
    predicted_price: float = Field(description="Predicted price")
    current_price: float = Field(description="Current market price")
    price_change: float = Field(description="Absolute price change")
    price_change_percent: float = Field(description="Percentage price change")
    confidence: float = Field(description="Prediction confidence")
    confidence_interval: ConfidenceInterval = Field(description="Confidence interval")
    individual_predictions: IndividualPredictions = Field(description="Individual model predictions")
    model_weights: ModelWeights = Field(description="Model ensemble weights")
    timestamp: str = Field(description="Prediction timestamp")
    status: str = Field(default="success", description="Response status")


class ZKProof(BaseModel):
    """Zero-Knowledge proof structure"""
    proof: Dict[str, Any] = Field(description="ZK proof object")
    public_signals: List[str] = Field(description="Public signals array")
    verified: bool = Field(description="Proof verification status")


class PrivacyStatus(BaseModel):
    """Privacy protection status"""
    model_config = ConfigDict(protected_namespaces=())
    
    model_weights_hidden: bool = Field(description="Model weights are hidden")
    individual_predictions_hidden: bool = Field(description="Individual predictions are hidden")
    circuit_verified: Optional[bool] = Field(default=True, description="ZK circuit verification status")
    circuit_hash: Optional[str] = Field(default=None, description="Circuit hash identifier")


class ZKPredictionResponse(PredictionResponse):
    """Response model for ZK-enhanced predictions"""
    zk_proof: ZKProof = Field(description="Zero-Knowledge proof")
    privacy_status: PrivacyStatus = Field(description="Privacy protection status")


class PriceSource(BaseModel):
    """Price source data"""
    source: str = Field(description="Source name")
    symbol: str = Field(description="Trading symbol")
    price: float = Field(description="Price from source")
    change_24h: float = Field(description="24h price change")
    volume_24h: float = Field(description="24h volume")
    market_cap: float = Field(description="Market cap")
    timestamp: float = Field(description="Source timestamp")
    raw_timestamp: str = Field(description="Raw timestamp")


class CurrentPriceResponse(BaseModel):
    """Current price response model"""
    aggregated_price: float = Field(description="Aggregated price")
    price_std: float = Field(description="Price standard deviation")
    confidence: float = Field(description="Price confidence")
    source_count: int = Field(description="Number of sources")
    sources: List[PriceSource] = Field(description="Data sources")
    timestamp: str = Field(description="Price timestamp")


class TechnicalIndicators(BaseModel):
    """Technical indicators data"""
    sma_7: float = Field(description="7-period SMA")
    sma_21: float = Field(description="21-period SMA")
    rsi: float = Field(description="RSI indicator")
    bb_upper: float = Field(description="Bollinger Bands upper")
    bb_middle: float = Field(description="Bollinger Bands middle")
    bb_lower: float = Field(description="Bollinger Bands lower")
    current_price: float = Field(description="Current price")


class TechnicalIndicatorsResponse(BaseModel):
    """Technical indicators response model"""
    symbol: str = Field(description="Trading symbol")
    indicators: TechnicalIndicators = Field(description="Technical indicators")
    timestamp: str = Field(description="Analysis timestamp")


class HealthResponse(BaseModel):
    """Health check response model"""
    status: str = Field(description="API health status")
    timestamp: str = Field(description="Health check timestamp")
    models_trained: bool = Field(description="Model training status")
    last_prediction: Optional[str] = Field(default=None, description="Last prediction timestamp")


class HistoricalDataPoint(BaseModel):
    """Historical price data point"""
    timestamp: str = Field(description="Data timestamp")
    price: float = Field(description="Price value")
    volume: Optional[float] = Field(default=None, description="Trading volume")


class HistoricalDataResponse(BaseModel):
    """Historical data response model"""
    symbol: str = Field(description="Trading symbol")
    period_days: int = Field(description="Data period in days")
    data_points: int = Field(description="Number of data points")
    data: List[HistoricalDataPoint] = Field(description="Historical data")
    timestamp: str = Field(description="Request timestamp")


class ModelStatusResponse(BaseModel):
    """Model status response model"""
    models_trained: bool = Field(description="Model training status")
    training_in_progress: bool = Field(description="Training in progress status")
    last_prediction: Optional[str] = Field(default=None, description="Last prediction timestamp")
    model_weights: ModelWeights = Field(description="Current model weights")
    prediction_history_count: int = Field(description="Number of predictions in history")


class SDKConfig(BaseModel):
    """SDK configuration model"""
    base_url: str = Field(description="Base API URL")
    timeout: float = Field(default=30.0, description="Request timeout in seconds")
    retries: int = Field(default=3, description="Number of retry attempts")
    retry_delay: float = Field(default=1.0, description="Delay between retries in seconds")
    enable_zk_verification: bool = Field(default=True, description="Enable ZK proof verification")


class SDKError(BaseModel):
    """SDK error model"""
    code: str = Field(description="Error code")
    message: str = Field(description="Error message")
    details: Optional[Any] = Field(default=None, description="Error details")
    timestamp: str = Field(description="Error timestamp")