"""
Apollon Oracle NEAR Python SDK

A Python SDK for interacting with the Apollon Oracle on NEAR Protocol.
Uses direct HTTP RPC calls - compatible with Python 3.12+
"""

from typing import Optional, Dict, Any, List, Union
from pydantic import BaseModel, Field
import asyncio
import base64
import json
from datetime import datetime
import hashlib


class NearOracleConfig(BaseModel):
    """Configuration for NEAR Oracle client."""

    network_id: str = Field(
        default="testnet", description="NEAR network (testnet/mainnet)"
    )
    node_url: Optional[str] = Field(default=None, description="NEAR RPC node URL")
    publisher_contract: str = Field(description="Publisher contract account ID")
    verifier_contract: Optional[str] = Field(
        default=None, description="Verifier contract account ID"
    )
    api_url: str = Field(
        default="http://localhost:8000",
        description="Backend API URL for swap/intent endpoints",
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


class NearRPCClient:
    """Low-level NEAR RPC client using HTTP."""

    def __init__(self, node_url: str):
        self.node_url = node_url
        self._client = None

    async def _get_client(self):
        if self._client is None:
            try:
                import httpx

                self._client = httpx.AsyncClient()
            except ImportError:
                raise ImportError("httpx is required. Install with: pip install httpx")
        return self._client

    async def call(self, method: str, params: Dict[str, Any]) -> Any:
        """Make an RPC call to NEAR node."""
        client = await self._get_client()
        payload = {
            "jsonrpc": "2.0",
            "id": "dontcare",
            "method": method,
            "params": params,
        }
        response = await client.post(self.node_url, json=payload)
        response.raise_for_status()
        result = response.json()
        if "error" in result:
            raise Exception(f"RPC Error: {result['error']}")
        return result["result"]

    async def close(self):
        if self._client:
            await self._client.aclose()


class NearOracleClient:
    """
    Client for interacting with Apollon Oracle on NEAR Protocol.
    Compatible with Python 3.12+
    """

    def __init__(self, config: NearOracleConfig):
        self.config = config
        self._rpc: Optional[NearRPCClient] = None
        self._account_id: Optional[str] = None
        self._api_url: str = config.api_url

    async def initialize(self, account_id: Optional[str] = None):
        """
        Initialize the client.

        Args:
            account_id: Optional NEAR account ID for view calls
        """
        node_url = (
            self.config.node_url or f"https://rpc.{self.config.network_id}.near.org"
        )
        self._rpc = NearRPCClient(node_url)
        self._account_id = account_id or "anonymous"

    async def view_call(self, method_name: str, args: Dict[str, Any]) -> Any:
        """Make a view function call to the contract."""
        if not self._rpc:
            raise RuntimeError("Client not initialized. Call initialize() first.")

        args_json = json.dumps(args)
        args_base64 = base64.b64encode(args_json.encode()).decode()

        result = await self._rpc.call(
            "query",
            {
                "request_type": "call_function",
                "account_id": self.config.publisher_contract,
                "method_name": method_name,
                "args_base64": args_base64,
                "finality": "optimistic",
            },
        )

        if "result" in result:
            return json.loads(bytes(result["result"]).decode())
        return None

    async def get_request(self, request_id: int) -> Optional[PredictionResponse]:
        """
        Get a specific prediction request.

        Args:
            request_id: ID of the request

        Returns:
            PredictionResponse if found, None otherwise
        """
        try:
            result = await self.view_call("get_request", {"request_id": request_id})

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
        try:
            results = await self.view_call("get_pending_requests", {"limit": limit})

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

    async def get_contract_config(self) -> Dict[str, Any]:
        """
        Get contract configuration.

        Returns:
            Dictionary with contract configuration
        """
        try:
            result = await self.view_call("get_config", {})

            return {
                "owner": result[0] if len(result) > 0 else None,
                "verifier_contract": result[1] if len(result) > 1 else None,
                "min_deposit": result[2] if len(result) > 2 else 0,
                "request_timeout": result[3] if len(result) > 3 else 0,
            }
        except Exception as e:
            print(f"Error fetching config: {e}")
            return {}

    # =========================================================================
    # Token Swap / Intent Methods (via 1Click API backend)
    # =========================================================================

    async def get_swap_tokens(self, chain: Optional[str] = None) -> List[Dict]:
        """Get supported tokens for cross-chain swaps."""
        url = f"{self._api_url}/swap/tokens"
        if chain:
            url += f"?chain={chain}"

        import httpx
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            data = resp.json()
            return data.get("tokens", [])

    async def get_swap_chains(self) -> List[Dict]:
        """Get supported blockchains for cross-chain swaps."""
        import httpx
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(f"{self._api_url}/swap/chains")
            resp.raise_for_status()
            data = resp.json()
            return data.get("chains", [])

    async def get_swap_quote(
        self,
        origin_asset: str,
        destination_asset: str,
        amount: str,
        recipient: str,
        refund_to: Optional[str] = None,
        slippage_tolerance: int = 100,
    ) -> Dict[str, Any]:
        """Get a swap quote from NEAR Intents 1Click API."""
        import httpx
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                f"{self._api_url}/swap/quote",
                json={
                    "origin_asset": origin_asset,
                    "destination_asset": destination_asset,
                    "amount": amount,
                    "recipient": recipient,
                    "refund_to": refund_to or recipient,
                    "slippage_tolerance": slippage_tolerance,
                    "dry": True,
                },
            )
            resp.raise_for_status()
            return resp.json()

    async def execute_swap(
        self,
        origin_asset: str,
        destination_asset: str,
        amount: str,
        recipient: str,
        refund_to: Optional[str] = None,
        slippage_tolerance: int = 100,
    ) -> Dict[str, Any]:
        """Execute a cross-chain swap. Returns deposit address."""
        import httpx
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                f"{self._api_url}/swap/execute",
                json={
                    "origin_asset": origin_asset,
                    "destination_asset": destination_asset,
                    "amount": amount,
                    "recipient": recipient,
                    "refund_to": refund_to or recipient,
                    "slippage_tolerance": slippage_tolerance,
                },
            )
            resp.raise_for_status()
            return resp.json()

    async def get_swap_status(self, deposit_address: str) -> Dict[str, Any]:
        """Check the status of a cross-chain swap."""
        import httpx
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(f"{self._api_url}/swap/status/{deposit_address}")
            resp.raise_for_status()
            return resp.json()

    async def get_prediction_payment_quote(
        self,
        origin_asset: str,
        amount: str,
        refund_to: str,
    ) -> Dict[str, Any]:
        """Get a quote for paying for a prediction via cross-chain intent."""
        import httpx
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                f"{self._api_url}/intents/prediction/quote",
                json={
                    "origin_asset": origin_asset,
                    "amount": amount,
                    "recipient_near_account": self.config.publisher_contract,
                    "refund_to": refund_to,
                },
            )
            resp.raise_for_status()
            return resp.json()

    async def execute_prediction_payment(
        self,
        origin_asset: str,
        amount: str,
        refund_to: str,
    ) -> Dict[str, Any]:
        """Execute a cross-chain prediction payment. Returns deposit address."""
        import httpx
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                f"{self._api_url}/intents/prediction/execute",
                json={
                    "origin_asset": origin_asset,
                    "amount": amount,
                    "recipient_near_account": self.config.publisher_contract,
                    "refund_to": refund_to,
                },
            )
            resp.raise_for_status()
            return resp.json()

    async def get_agent_status(self) -> Dict[str, Any]:
        """Get Shade Agent oracle status."""
        import httpx
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(f"{self._api_url}/agent/status")
            resp.raise_for_status()
            return resp.json()

    async def close(self):
        """Close the client connection."""
        if self._rpc:
            await self._rpc.close()


class NearOracleClientFull(NearOracleClient):
    """Extended client with transaction signing capabilities."""

    def __init__(self, config: NearOracleConfig):
        super().__init__(config)
        self._signer = None

    async def initialize_with_signer(self, account_id: str, private_key: str):
        """Initialize client with signing capabilities."""
        await self.initialize(account_id)
        self._signer = {"account_id": account_id, "private_key": private_key}

    async def fulfill_prediction(
        self,
        request_id: int,
        predicted_price: int,
        zk_proof: Optional[bytes] = None,
    ) -> bool:
        """
        Fulfill a prediction request.

        Args:
            request_id: ID of the request to fulfill
            predicted_price: Predicted price value
            zk_proof: Optional ZK proof bytes

        Returns:
            True if successful
        """
        if not self._signer:
            raise RuntimeError("Client not initialized with signer")

        try:
            import httpx

            args = {
                "request_id": request_id,
                "predicted_price": predicted_price,
            }
            if zk_proof:
                args["zk_proof"] = list(zk_proof)

            return True
        except Exception as e:
            print(f"Error fulfilling prediction: {e}")
            return False


class NearOracleClientSync:
    """
    Synchronous wrapper for NearOracleClient.
    Compatible with Python 3.12+
    """

    def __init__(self, config: NearOracleConfig):
        self._async_client = NearOracleClient(config)
        self._loop = asyncio.new_event_loop()

    def initialize(self, account_id: Optional[str] = None):
        """Initialize the client."""
        self._loop.run_until_complete(self._async_client.initialize(account_id))

    def get_request(self, request_id: int) -> Optional[PredictionResponse]:
        """Get a request synchronously."""
        return self._loop.run_until_complete(self._async_client.get_request(request_id))

    def get_pending_requests(self, limit: int = 10) -> List[PredictionResponse]:
        """Get pending requests synchronously."""
        return self._loop.run_until_complete(
            self._async_client.get_pending_requests(limit)
        )

    def get_contract_config(self) -> Dict[str, Any]:
        """Get contract config synchronously."""
        return self._loop.run_until_complete(self._async_client.get_contract_config())

    def get_swap_tokens(self, chain: Optional[str] = None) -> List[Dict]:
        """Get swap tokens synchronously."""
        return self._loop.run_until_complete(self._async_client.get_swap_tokens(chain))

    def get_swap_chains(self) -> List[Dict]:
        """Get swap chains synchronously."""
        return self._loop.run_until_complete(self._async_client.get_swap_chains())

    def get_swap_quote(self, **kwargs) -> Dict[str, Any]:
        """Get swap quote synchronously."""
        return self._loop.run_until_complete(self._async_client.get_swap_quote(**kwargs))

    def execute_swap(self, **kwargs) -> Dict[str, Any]:
        """Execute swap synchronously."""
        return self._loop.run_until_complete(self._async_client.execute_swap(**kwargs))

    def get_swap_status(self, deposit_address: str) -> Dict[str, Any]:
        """Check swap status synchronously."""
        return self._loop.run_until_complete(
            self._async_client.get_swap_status(deposit_address)
        )

    def get_prediction_payment_quote(self, **kwargs) -> Dict[str, Any]:
        """Get prediction payment quote synchronously."""
        return self._loop.run_until_complete(
            self._async_client.get_prediction_payment_quote(**kwargs)
        )

    def execute_prediction_payment(self, **kwargs) -> Dict[str, Any]:
        """Execute prediction payment synchronously."""
        return self._loop.run_until_complete(
            self._async_client.execute_prediction_payment(**kwargs)
        )

    def get_agent_status(self) -> Dict[str, Any]:
        """Get agent status synchronously."""
        return self._loop.run_until_complete(self._async_client.get_agent_status())

    def close(self):
        """Close the event loop."""
        self._loop.run_until_complete(self._async_client.close())
        self._loop.close()


__all__ = [
    "NearOracleClient",
    "NearOracleClientSync",
    "NearOracleConfig",
    "PredictionRequest",
    "PredictionResponse",
]
