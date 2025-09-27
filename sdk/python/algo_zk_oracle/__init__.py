"""
Apollon - ZK Oracle Price Oracle SDK

A Python SDK for interacting with the Apollon - ZK Oracle Price Oracle API,
featuring zero-knowledge proof verification for privacy-enhanced 
machine learning predictions.
"""

from .client.oracle_client import AlgoZKOracleClient, AlgoZKOracleClientSync
from .types.models import (
    PredictionRequest,
    PredictionResponse,
    ZKPredictionResponse,
    CurrentPriceResponse,
    TechnicalIndicatorsResponse,
    HealthResponse,
    HistoricalDataResponse,
    ModelStatusResponse,
    SDKConfig,
)
from .exceptions.errors import (
    AlgoZKOracleError,
    NetworkError,
    ValidationError,
    ZKVerificationError,
    ModelNotReadyError,
    RateLimitError,
)

__version__ = "1.0.0"
__author__ = "Apollon - ZK Oracle Oracle Team"

__all__ = [
    "AlgoZKOracleClient",
    "AlgoZKOracleClientSync",
    "PredictionRequest",
    "PredictionResponse", 
    "ZKPredictionResponse",
    "CurrentPriceResponse",
    "TechnicalIndicatorsResponse",
    "HealthResponse",
    "HistoricalDataResponse",
    "ModelStatusResponse",
    "SDKConfig",
    "AlgoZKOracleError",
    "NetworkError",
    "ValidationError",
    "ZKVerificationError",
    "ModelNotReadyError",
    "RateLimitError",
]