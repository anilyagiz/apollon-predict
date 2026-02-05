"""
Apollon Oracle NEAR Python SDK

A Python SDK for interacting with the Apollon Oracle on NEAR Protocol.
"""

from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
import asyncio
from datetime import datetime


class NearOracleConfig(BaseModel):
    """Configuration for NEAR Oracle client."""

    network_id: str = Field(
        default="testnet", description="NEAR network (testnet/mainnet)"
    )
    node_url: Optional[str] = Field(default=None, description="NEAR RPC node URL")
    wallet_url: Optional[str] = Field(default=None, description="NEAR Wallet URL")
    helper_url: Optional[str] = Field(default=None, description="NEAR Helper URL")
    explorer_url: Optional[str] = Field(default=None, description="NEAR Explorer URL")
    publisher_contract: str = Field(description="Publisher contract account ID")
    verifier_contract: Optional[str] = Field(
        default=None, description="Verifier contract account ID"
    )

    class Config:
        arbitrary_types_allowed = True


class PredictionRequest(BaseModel):
    """Prediction request parameters."""

    asset: str = Field(description="Asset to predict (e.g., 'NEAR', 'ALGO')")
    timeframe: str = Field(description="Timeframe (e.g., '24h', '7d')")
    zk_required: bool = Field(default=True, description="Whether ZK proof is required")


class PredictionResponse(BaseModel):
    """Prediction response data."""

    request_id: int
    asset: str
    timeframe: str
    predicted_price: Optional[float] = Field(
        default=None, description="Predicted price (scaled by 1000)"
    )
    zk_verified: Optional[bool] = None
    status: str = Field(
        description="Request status: Pending, Fulfilled, Expired, Cancelled"
    )
    created_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    solver: Optional[str] = None


class NearOracleClient:
    """
    Client for interacting with Apollon Oracle on NEAR Protocol.

    This client supports both async and sync usage patterns.

    Example:
        ```python
        from apollon_near_sdk import NearOracleClient, NearOracleConfig

        config = NearOracleConfig(
            network_id="testnet",
            publisher_contract="apollon-publisher.testnet",
            verifier_contract="apollon-verifier.testnet",
        )

        client = NearOracleClient(config)

        # Request a prediction
        request_id = await client.request_prediction(
            PredictionRequest(asset="NEAR", timeframe="24h", zk_required=True),
            deposit="0.1"
        )

        # Check request status
        request = await client.get_request(request_id)
        print(f"Status: {request.status}, Price: {request.predicted_price}")
        ```
    """

    def __init__(self, config: NearOracleConfig):
        """
        Initialize the NEAR Oracle client.

        Args:
            config: Configuration for the client
        """
        self.config = config
        self._account = None
        self._near = None

    async def initialize(self, account_id: str, private_key: str):
        """
        Initialize the client with account credentials.

        Args:
            account_id: NEAR account ID (e.g., 'alice.testnet')
            private_key: Private key for the account
        """
        try:
            from near_api.account import Account
            from near_api.providers import JsonProvider
            from near_api.signer import KeyPair, Signer

            node_url = (
                self.config.node_url or f"https://rpc.{self.config.network_id}.near.org"
            )
            provider = JsonProvider(node_url)

            key_pair = KeyPair(private_key)
            signer = Signer(account_id, key_pair)

            self._account = Account(provider, signer, account_id)
            self._near = provider

        except ImportError:
            raise ImportError(
                "near-api-py is required. Install with: pip install near-api-py"
            )

    async def request_prediction(
        self, request: PredictionRequest, deposit: str = "0.1"
    ) -> int:
        """
        Request a price prediction.

        Args:
            request: Prediction request parameters
            deposit: Deposit amount in NEAR (default: 0.1)

        Returns:
            Request ID

        Raises:
            RuntimeError: If client not initialized
            ValueError: If deposit is insufficient
        """
        if not self._account:
            raise RuntimeError("Client not initialized. Call initialize() first.")

        # Convert NEAR to yoctoNEAR
        deposit_yocto = int(float(deposit) * 1e24)
        min_deposit = int(0.1 * 1e24)

        if deposit_yocto < min_deposit:
            raise ValueError(f"Deposit must be at least 0.1 NEAR")

        result = await self._account.function_call(
            contract_id=self.config.publisher_contract,
            method_name="request_prediction",
            args={
                "asset": request.asset,
                "timeframe": request.timeframe,
                "zk_required": request.zk_required,
            },
            gas=50_000_000_000_000,  # 50 TGas
            amount=deposit_yocto,
        )

        # Extract request_id from result
        if result and "status" in result:
            status = result["status"]
            if "SuccessValue" in status and status["SuccessValue"]:
                import base64

                value = base64.b64decode(status["SuccessValue"]).decode("utf-8")
                return int(value.strip('"'))

        # If we can't extract the ID, return 0 (shouldn't happen on success)
        return 0

    async def get_request(self, request_id: int) -> Optional[PredictionResponse]:
        """
        Get a specific prediction request.

        Args:
            request_id: ID of the request

        Returns:
            PredictionResponse if found, None otherwise
        """
        if not self._account:
            raise RuntimeError("Client not initialized. Call initialize() first.")

        try:
            result = await self._account.view_function(
                contract_id=self.config.publisher_contract,
                method_name="get_request",
                args={"request_id": request_id},
            )

            if not result:
                return None

            return PredictionResponse(
                request_id=result.get("request_id", request_id),
                asset=result.get("asset", ""),
                timeframe=result.get("timeframe", ""),
                predicted_price=result.get("predicted_price"),
                zk_verified=result.get("zk_verified"),
                status=result.get("status", "Unknown"),
            )
        except Exception as e:
            print(f"Error fetching request: {e}")
            return None

    async def get_pending_requests(self, limit: int = 10) -> List[PredictionResponse]:
        """
        Get pending prediction requests.

        Args:
            limit: Maximum number of requests to return

        Returns:
            List of pending prediction requests
        """
        if not self._account:
            raise RuntimeError("Client not initialized. Call initialize() first.")

        try:
            results = await self._account.view_function(
                contract_id=self.config.publisher_contract,
                method_name="get_pending_requests",
                args={"limit": limit},
            )

            return [
                PredictionResponse(
                    request_id=r.get("request_id", 0),
                    asset=r.get("asset", ""),
                    timeframe=r.get("timeframe", ""),
                    predicted_price=r.get("predicted_price"),
                    zk_verified=r.get("zk_verified"),
                    status=r.get("status", "Unknown"),
                )
                for r in (results or [])
            ]
        except Exception as e:
            print(f"Error fetching pending requests: {e}")
            return []

    async def cancel_request(self, request_id: int) -> bool:
        """
        Cancel a pending request.

        Args:
            request_id: ID of the request to cancel

        Returns:
            True if cancelled successfully

        Raises:
            RuntimeError: If request not found or not cancellable
        """
        if not self._account:
            raise RuntimeError("Client not initialized. Call initialize() first.")

        try:
            await self._account.function_call(
                contract_id=self.config.publisher_contract,
                method_name="cancel_request",
                args={"request_id": request_id},
                gas=50_000_000_000_000,  # 50 TGas
            )
            return True
        except Exception as e:
            print(f"Error cancelling request: {e}")
            return False

    async def get_contract_config(self) -> Dict[str, Any]:
        """
        Get contract configuration.

        Returns:
            Dictionary with contract configuration
        """
        if not self._account:
            raise RuntimeError("Client not initialized. Call initialize() first.")

        result = await self._account.view_function(
            contract_id=self.config.publisher_contract,
            method_name="get_config",
            args={},
        )

        return {
            "owner": result[0] if len(result) > 0 else None,
            "verifier_contract": result[1] if len(result) > 1 else None,
            "min_deposit": result[2] if len(result) > 2 else 0,
            "request_timeout": result[3] if len(result) > 3 else 0,
        }


class NearOracleClientSync:
    """
    Synchronous wrapper for NearOracleClient.

    Provides the same interface as NearOracleClient but without async/await.
    """

    def __init__(self, config: NearOracleConfig):
        self._async_client = NearOracleClient(config)
        self._loop = asyncio.new_event_loop()

    def initialize(self, account_id: str, private_key: str):
        """Initialize the client."""
        self._loop.run_until_complete(
            self._async_client.initialize(account_id, private_key)
        )

    def request_prediction(
        self, request: PredictionRequest, deposit: str = "0.1"
    ) -> int:
        """Request a prediction synchronously."""
        return self._loop.run_until_complete(
            self._async_client.request_prediction(request, deposit)
        )

    def get_request(self, request_id: int) -> Optional[PredictionResponse]:
        """Get a request synchronously."""
        return self._loop.run_until_complete(self._async_client.get_request(request_id))

    def get_pending_requests(self, limit: int = 10) -> List[PredictionResponse]:
        """Get pending requests synchronously."""
        return self._loop.run_until_complete(
            self._async_client.get_pending_requests(limit)
        )

    def cancel_request(self, request_id: int) -> bool:
        """Cancel a request synchronously."""
        return self._loop.run_until_complete(
            self._async_client.cancel_request(request_id)
        )

    def get_contract_config(self) -> Dict[str, Any]:
        """Get contract config synchronously."""
        return self._loop.run_until_complete(self._async_client.get_contract_config())

    def close(self):
        """Close the event loop."""
        self._loop.close()


# Convenience exports
__all__ = [
    "NearOracleClient",
    "NearOracleClientSync",
    "NearOracleConfig",
    "PredictionRequest",
    "PredictionResponse",
]
