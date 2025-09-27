"""
Error handling for Apollon - ZK Oracle Oracle SDK
"""

from typing import Any, Optional
from datetime import datetime


class AlgoZKOracleError(Exception):
    """Base exception for Apollon - ZK Oracle Oracle SDK"""
    
    def __init__(self, code: str, message: str, details: Optional[Any] = None):
        super().__init__(message)
        self.code = code
        self.message = message
        self.details = details
        self.timestamp = datetime.now().isoformat()
    
    def to_dict(self) -> dict:
        """Convert error to dictionary"""
        return {
            "code": self.code,
            "message": self.message,
            "details": self.details,
            "timestamp": self.timestamp,
        }


class NetworkError(AlgoZKOracleError):
    """Network-related errors"""
    
    def __init__(self, message: str, details: Optional[Any] = None):
        super().__init__("NETWORK_ERROR", message, details)


class ValidationError(AlgoZKOracleError):
    """Request validation errors"""
    
    def __init__(self, message: str, details: Optional[Any] = None):
        super().__init__("VALIDATION_ERROR", message, details)


class ZKVerificationError(AlgoZKOracleError):
    """Zero-Knowledge proof verification errors"""
    
    def __init__(self, message: str, details: Optional[Any] = None):
        super().__init__("ZK_VERIFICATION_ERROR", message, details)


class ModelNotReadyError(AlgoZKOracleError):
    """ML models not ready errors"""
    
    def __init__(self, message: str = "ML models are still training"):
        super().__init__("MODEL_NOT_READY", message)


class RateLimitError(AlgoZKOracleError):
    """Rate limiting errors"""
    
    def __init__(self, message: str = "Rate limit exceeded"):
        super().__init__("RATE_LIMIT_ERROR", message)


class ServerError(AlgoZKOracleError):
    """Server-side errors"""
    
    def __init__(self, message: str, details: Optional[Any] = None):
        super().__init__("SERVER_ERROR", message, details)


def is_retryable_error(error: Exception) -> bool:
    """Check if an error is retryable"""
    if isinstance(error, AlgoZKOracleError):
        return error.code in ["NETWORK_ERROR", "MODEL_NOT_READY", "SERVER_ERROR"]
    
    # Handle httpx errors
    if hasattr(error, "response") and error.response:
        status = error.response.status_code
        return status >= 500 or status == 503 or status == 429
    
    return False