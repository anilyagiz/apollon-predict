"""
Main Apollon - ZK Oracle Oracle SDK Client
"""

import httpx
import asyncio
from typing import Optional, Dict, Any
from datetime import datetime

from ..types.models import (
    SDKConfig,
    PredictionRequest,
    PredictionResponse,
    ZKPredictionResponse,
    CurrentPriceResponse,
    TechnicalIndicatorsResponse,
    HealthResponse,
    HistoricalDataResponse,
    ModelStatusResponse,
)
from ..exceptions.errors import (
    AlgoZKOracleError,
    NetworkError,
    ValidationError,
    ModelNotReadyError,
    RateLimitError,
    ServerError,
)
from ..utils.retry import retry_async_func, RetryConfig


class AlgoZKOracleClient:
    """
    Async client for Apollon - ZK Oracle Price Oracle API
    
    Provides access to price predictions, ZK-enhanced predictions,
    technical indicators, and other oracle data.
    """
    
    def __init__(self, config: SDKConfig):
        self.config = config
        self.retry_config = RetryConfig(
            max_attempts=config.retries,
            delay=config.retry_delay,
        )
        
        # Initialize HTTP client
        self.client = httpx.AsyncClient(
            base_url=config.base_url,
            timeout=config.timeout,
            headers={
                "Content-Type": "application/json",
                "User-Agent": "algo-zk-oracle-sdk-python/1.0.0",
            },
        )
    
    async def __aenter__(self):
        """Async context manager entry"""
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        await self.close()
    
    async def close(self):
        """Close HTTP client"""
        await self.client.aclose()
    
    def _handle_response_error(self, response: httpx.Response):
        """Handle HTTP response errors"""
        if response.status_code == 400:
            detail = response.json().get("detail", "Invalid request")
            raise ValidationError(detail)
        elif response.status_code == 429:
            detail = response.json().get("detail", "Rate limit exceeded")
            raise RateLimitError(detail)
        elif response.status_code == 503:
            detail = response.json().get("detail", "Service unavailable")
            if "training" in detail.lower():
                raise ModelNotReadyError(detail)
            raise NetworkError(detail)
        elif response.status_code >= 500:
            detail = response.json().get("detail", "Internal server error")
            raise ServerError(detail)
        else:
            raise NetworkError(f"HTTP {response.status_code}: {response.text}")
    
    async def _request(
        self,
        method: str,
        endpoint: str,
        json_data: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Make HTTP request with error handling"""
        try:
            response = await self.client.request(
                method=method,
                url=endpoint,
                json=json_data,
                params=params,
            )
            
            if not response.is_success:
                self._handle_response_error(response)
            
            return response.json()
            
        except httpx.RequestError as error:
            raise NetworkError(f"Network error: {str(error)}")
        except httpx.TimeoutException:
            raise NetworkError("Request timeout")
    
    async def health(self) -> HealthResponse:
        """Check API health status"""
        async def _health():
            data = await self._request("GET", "/health")
            return HealthResponse(**data)
        
        return await retry_async_func(_health, self.retry_config)
    
    async def get_current_price(self) -> CurrentPriceResponse:
        """Get current aggregated price"""
        async def _get_price():
            data = await self._request("GET", "/price/current")
            return CurrentPriceResponse(**data)
        
        return await retry_async_func(_get_price, self.retry_config)
    
    async def get_technical_indicators(self) -> TechnicalIndicatorsResponse:
        """Get technical indicators"""
        async def _get_technicals():
            data = await self._request("GET", "/price/technicals")
            return TechnicalIndicatorsResponse(**data)
        
        return await retry_async_func(_get_technicals, self.retry_config)
    
    async def get_historical_data(self, days: int = 30) -> HistoricalDataResponse:
        """Get historical price data"""
        if days > 365:
            raise ValidationError("Maximum historical data period is 365 days")
        
        async def _get_historical():
            data = await self._request("GET", "/price/historical", params={"days": days})
            return HistoricalDataResponse(**data)
        
        return await retry_async_func(_get_historical, self.retry_config)
    
    async def get_model_status(self) -> ModelStatusResponse:
        """Get model training status"""
        async def _get_status():
            data = await self._request("GET", "/models/status")
            return ModelStatusResponse(**data)
        
        return await retry_async_func(_get_status, self.retry_config)
    
    async def predict(self, request: Optional[PredictionRequest] = None) -> PredictionResponse:
        """Generate price prediction"""
        if request is None:
            request = PredictionRequest()
        
        async def _predict():
            data = await self._request("POST", "/predict", json_data=request.dict())
            return PredictionResponse(**data)
        
        return await retry_async_func(_predict, self.retry_config)
    
    async def predict_with_zk(self, request: Optional[PredictionRequest] = None) -> ZKPredictionResponse:
        """Generate privacy-enhanced prediction with ZK proof"""
        if request is None:
            request = PredictionRequest()
        
        async def _predict_zk():
            data = await self._request("POST", "/predict-zk", json_data=request.dict())
            result = ZKPredictionResponse(**data)
            
            # Add client-side verification if enabled
            if self.config.enable_zk_verification:
                # Note: Client-side ZK verification would require
                # JavaScript/WASM components that are complex to implement in Python
                # For now, we rely on server-side verification
                pass
            
            return result
        
        return await retry_async_func(_predict_zk, self.retry_config)
    
    async def verify_zk_proof(self, proof: Dict[str, Any], public_signals: list) -> bool:
        """Verify a ZK proof independently"""
        async def _verify():
            data = await self._request(
                "POST", 
                "/verify-zk", 
                json_data={
                    "proof": proof,
                    "public_signals": public_signals,
                }
            )
            return data["verified"]
        
        return await retry_async_func(_verify, self.retry_config)
    
    async def retrain_models(self) -> Dict[str, str]:
        """Trigger model retraining (admin function)"""
        data = await self._request("POST", "/models/retrain")
        return data
    
    async def wait_for_models(self, max_wait_time: float = 300.0) -> bool:
        """Wait for models to be ready"""
        start_time = asyncio.get_event_loop().time()
        
        while (asyncio.get_event_loop().time() - start_time) < max_wait_time:
            try:
                health = await self.health()
                if health.models_trained:
                    return True
            except Exception:
                # Continue waiting on errors
                pass
            
            await asyncio.sleep(5.0)  # Wait 5 seconds
        
        return False


# Synchronous wrapper for convenience
class AlgoZKOracleClientSync:
    """
    Synchronous wrapper for AlgoZKOracleClient
    
    Provides a sync interface for the async client.
    """
    
    def __init__(self, config: SDKConfig):
        self.config = config
        self._client: Optional[AlgoZKOracleClient] = None
    
    def _get_client(self) -> AlgoZKOracleClient:
        """Get or create async client"""
        if self._client is None:
            self._client = AlgoZKOracleClient(self.config)
        return self._client
    
    def _run_async(self, coro):
        """Run async coroutine in sync context"""
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        
        return loop.run_until_complete(coro)
    
    def health(self) -> HealthResponse:
        """Check API health status"""
        return self._run_async(self._get_client().health())
    
    def get_current_price(self) -> CurrentPriceResponse:
        """Get current aggregated price"""
        return self._run_async(self._get_client().get_current_price())
    
    def get_technical_indicators(self) -> TechnicalIndicatorsResponse:
        """Get technical indicators"""
        return self._run_async(self._get_client().get_technical_indicators())
    
    def get_historical_data(self, days: int = 30) -> HistoricalDataResponse:
        """Get historical price data"""
        return self._run_async(self._get_client().get_historical_data(days))
    
    def get_model_status(self) -> ModelStatusResponse:
        """Get model training status"""
        return self._run_async(self._get_client().get_model_status())
    
    def predict(self, request: Optional[PredictionRequest] = None) -> PredictionResponse:
        """Generate price prediction"""
        return self._run_async(self._get_client().predict(request))
    
    def predict_with_zk(self, request: Optional[PredictionRequest] = None) -> ZKPredictionResponse:
        """Generate privacy-enhanced prediction with ZK proof"""
        return self._run_async(self._get_client().predict_with_zk(request))
    
    def verify_zk_proof(self, proof: Dict[str, Any], public_signals: list) -> bool:
        """Verify a ZK proof independently"""
        return self._run_async(self._get_client().verify_zk_proof(proof, public_signals))
    
    def wait_for_models(self, max_wait_time: float = 300.0) -> bool:
        """Wait for models to be ready"""
        return self._run_async(self._get_client().wait_for_models(max_wait_time))
    
    def close(self):
        """Close the client"""
        if self._client:
            self._run_async(self._client.close())