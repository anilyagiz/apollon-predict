"""
NEAR Intents Service - 1Click API Client
Provides cross-chain token swap/bridge and intent-based prediction payments
via the NEAR Intents 1Click API (https://1click.chaindefuser.com)
"""

import logging
import time
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

import httpx

logger = logging.getLogger(__name__)

# 1Click API base URL
ONECLICK_BASE_URL = "https://1click.chaindefuser.com"

# Supported chain display metadata
CHAIN_METADATA = {
    "near": {"name": "NEAR Protocol", "icon": "near", "type": "near"},
    "solana": {"name": "Solana", "icon": "solana", "type": "solana"},
    "ethereum": {"name": "Ethereum", "icon": "ethereum", "type": "evm"},
    "arbitrum": {"name": "Arbitrum", "icon": "arbitrum", "type": "evm"},
    "base": {"name": "Base", "icon": "base", "type": "evm"},
    "polygon": {"name": "Polygon", "icon": "polygon", "type": "evm"},
    "avalanche": {"name": "Avalanche", "icon": "avalanche", "type": "evm"},
    "bsc": {"name": "BNB Chain", "icon": "bnb", "type": "evm"},
    "optimism": {"name": "Optimism", "icon": "optimism", "type": "evm"},
    "aurora": {"name": "Aurora", "icon": "aurora", "type": "evm"},
    "bitcoin": {"name": "Bitcoin", "icon": "bitcoin", "type": "bitcoin"},
    "ton": {"name": "TON", "icon": "ton", "type": "ton"},
    "tron": {"name": "Tron", "icon": "tron", "type": "tron"},
    "xrp": {"name": "XRP Ledger", "icon": "xrp", "type": "xrp"},
    "stellar": {"name": "Stellar", "icon": "stellar", "type": "stellar"},
    "sui": {"name": "Sui", "icon": "sui", "type": "sui"},
    "dogecoin": {"name": "Dogecoin", "icon": "doge", "type": "bitcoin"},
    "litecoin": {"name": "Litecoin", "icon": "litecoin", "type": "bitcoin"},
}

# Primary swap pairs (highlighted in UI)
PRIMARY_CHAINS = ["near", "solana", "ethereum"]


class IntentsServiceError(Exception):
    """Base error for intents service"""

    def __init__(self, message: str, status_code: int = 500, details: Any = None):
        self.message = message
        self.status_code = status_code
        self.details = details
        super().__init__(message)


class IntentsService:
    """
    Client for NEAR Intents 1Click API.
    Handles cross-chain token swaps and intent-based prediction payments.
    """

    def __init__(self, api_key: Optional[str] = None, redis_client=None):
        self.api_key = api_key
        self.redis = redis_client
        self._token_cache: Optional[Dict] = None
        self._token_cache_time: float = 0
        self._cache_ttl = 300  # 5 minutes

    def _get_headers(self) -> Dict[str, str]:
        """Get request headers with optional API key auth."""
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        return headers

    # -------------------------------------------------------------------------
    # Token / Chain Discovery
    # -------------------------------------------------------------------------

    async def get_supported_tokens(self, force_refresh: bool = False) -> List[Dict]:
        """
        Fetch supported tokens from 1Click API.
        Results are cached for 5 minutes (in-memory or Redis).
        """
        # Check in-memory cache
        if (
            not force_refresh
            and self._token_cache
            and (time.time() - self._token_cache_time) < self._cache_ttl
        ):
            return self._token_cache["tokens"]

        # Check Redis cache
        if self.redis and not force_refresh:
            try:
                cached = await self.redis.get("intents:tokens")
                if cached:
                    import json

                    self._token_cache = json.loads(cached)
                    self._token_cache_time = time.time()
                    return self._token_cache["tokens"]
            except Exception as e:
                logger.warning(f"Redis cache read failed: {e}")

        # Fetch from 1Click API
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(
                    f"{ONECLICK_BASE_URL}/v0/tokens",
                    headers=self._get_headers(),
                )
                resp.raise_for_status()
                tokens = resp.json()

                # Cache the result
                cache_data = {"tokens": tokens, "fetched_at": datetime.now().isoformat()}
                self._token_cache = cache_data
                self._token_cache_time = time.time()

                # Store in Redis if available
                if self.redis:
                    try:
                        import json

                        await self.redis.setex(
                            "intents:tokens",
                            self._cache_ttl,
                            json.dumps(cache_data),
                        )
                    except Exception as e:
                        logger.warning(f"Redis cache write failed: {e}")

                logger.info(f"Fetched {len(tokens)} tokens from 1Click API")
                return tokens

        except httpx.HTTPStatusError as e:
            logger.error(f"1Click API error: {e.response.status_code}")
            raise IntentsServiceError(
                f"Failed to fetch tokens: {e.response.status_code}",
                status_code=e.response.status_code,
            )
        except Exception as e:
            logger.error(f"Failed to fetch tokens: {e}")
            raise IntentsServiceError(f"Failed to fetch tokens: {str(e)}")

    async def get_supported_chains(self) -> List[Dict]:
        """Get list of supported chains with metadata."""
        tokens = await self.get_supported_tokens()

        # Extract unique chains from token list
        chains_seen = set()
        chains = []

        for token in tokens:
            blockchain = token.get("blockchain", "").lower()
            if blockchain and blockchain not in chains_seen:
                chains_seen.add(blockchain)
                meta = CHAIN_METADATA.get(blockchain, {})
                chains.append(
                    {
                        "id": blockchain,
                        "name": meta.get("name", blockchain.title()),
                        "icon": meta.get("icon", blockchain),
                        "type": meta.get("type", "unknown"),
                        "is_primary": blockchain in PRIMARY_CHAINS,
                    }
                )

        # Sort: primary chains first, then alphabetical
        chains.sort(key=lambda c: (not c["is_primary"], c["name"]))
        return chains

    async def get_tokens_by_chain(self, chain: str) -> List[Dict]:
        """Get tokens filtered by blockchain."""
        tokens = await self.get_supported_tokens()
        return [
            t for t in tokens if t.get("blockchain", "").lower() == chain.lower()
        ]

    # -------------------------------------------------------------------------
    # Swap / Quote
    # -------------------------------------------------------------------------

    async def request_quote(
        self,
        origin_asset: str,
        destination_asset: str,
        amount: str,
        swap_type: str = "EXACT_INPUT",
        slippage_tolerance: int = 100,  # 1% in basis points
        recipient: str = "",
        refund_to: str = "",
        dry: bool = True,
        deadline_minutes: int = 30,
    ) -> Dict:
        """
        Request a swap quote from 1Click API.

        Args:
            origin_asset: Asset ID of the origin token (e.g. "nep141:wrap.near")
            destination_asset: Asset ID of the destination token
            amount: Amount in smallest unit of the origin token
            swap_type: EXACT_INPUT, EXACT_OUTPUT, or FLEX_INPUT
            slippage_tolerance: Slippage in basis points (100 = 1%)
            recipient: Destination address for swapped tokens
            refund_to: Address for refunds if swap fails
            dry: If True, get quote without generating deposit address
            deadline_minutes: Deadline for the swap in minutes from now

        Returns:
            Quote response with pricing and deposit details
        """
        deadline = (datetime.utcnow() + timedelta(minutes=deadline_minutes)).isoformat() + "Z"

        payload = {
            "dry": dry,
            "swapType": swap_type,
            "slippageTolerance": slippage_tolerance,
            "originAsset": origin_asset,
            "depositType": "ORIGIN_CHAIN",
            "destinationAsset": destination_asset,
            "amount": amount,
            "recipient": recipient,
            "recipientType": "DESTINATION_CHAIN",
            "refundTo": refund_to or recipient,
            "refundType": "ORIGIN_CHAIN",
            "deadline": deadline,
            "quoteWaitingTimeMs": 3000,
        }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(
                    f"{ONECLICK_BASE_URL}/v0/quote",
                    headers=self._get_headers(),
                    json=payload,
                )
                resp.raise_for_status()
                quote = resp.json()

                logger.info(
                    f"Quote received: {origin_asset} -> {destination_asset}, "
                    f"amount_in={quote.get('quote', {}).get('amountInFormatted', 'N/A')}, "
                    f"amount_out={quote.get('quote', {}).get('amountOutFormatted', 'N/A')}"
                )
                return quote

        except httpx.HTTPStatusError as e:
            error_body = e.response.text
            logger.error(f"Quote request failed: {e.response.status_code} - {error_body}")
            raise IntentsServiceError(
                f"Quote request failed: {e.response.status_code}",
                status_code=e.response.status_code,
                details=error_body,
            )
        except Exception as e:
            logger.error(f"Quote request error: {e}")
            raise IntentsServiceError(f"Quote request failed: {str(e)}")

    async def execute_swap(
        self,
        origin_asset: str,
        destination_asset: str,
        amount: str,
        recipient: str,
        refund_to: str = "",
        swap_type: str = "EXACT_INPUT",
        slippage_tolerance: int = 100,
        deadline_minutes: int = 30,
    ) -> Dict:
        """
        Execute a swap by requesting a non-dry quote (generates deposit address).

        Returns:
            Quote response with depositAddress for the user to send tokens to.
        """
        return await self.request_quote(
            origin_asset=origin_asset,
            destination_asset=destination_asset,
            amount=amount,
            swap_type=swap_type,
            slippage_tolerance=slippage_tolerance,
            recipient=recipient,
            refund_to=refund_to or recipient,
            dry=False,
            deadline_minutes=deadline_minutes,
        )

    # -------------------------------------------------------------------------
    # Deposit & Status
    # -------------------------------------------------------------------------

    async def submit_deposit(
        self,
        tx_hash: str,
        deposit_address: str,
        near_sender_account: Optional[str] = None,
    ) -> Dict:
        """
        Submit deposit transaction hash to speed up processing.

        Args:
            tx_hash: Blockchain transaction hash of the deposit
            deposit_address: The deposit address from the quote
            near_sender_account: NEAR sender account (for NEAR deposits only)
        """
        payload: Dict[str, Any] = {
            "txHash": tx_hash,
            "depositAddress": deposit_address,
        }
        if near_sender_account:
            payload["nearSenderAccount"] = near_sender_account

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(
                    f"{ONECLICK_BASE_URL}/v0/deposit/submit",
                    headers=self._get_headers(),
                    json=payload,
                )
                resp.raise_for_status()
                result = resp.json()

                logger.info(f"Deposit submitted: {tx_hash} -> {deposit_address}")
                return result

        except httpx.HTTPStatusError as e:
            logger.error(f"Deposit submit failed: {e.response.status_code}")
            raise IntentsServiceError(
                f"Deposit submit failed: {e.response.status_code}",
                status_code=e.response.status_code,
            )
        except Exception as e:
            logger.error(f"Deposit submit error: {e}")
            raise IntentsServiceError(f"Deposit submit failed: {str(e)}")

    async def get_swap_status(self, deposit_address: str) -> Dict:
        """
        Check the execution status of a swap.

        Returns:
            Status object with fields: status, quoteResponse, swapDetails, etc.
            Statuses: PENDING_DEPOSIT, PROCESSING, SUCCESS, INCOMPLETE_DEPOSIT, REFUNDED, FAILED
        """
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.get(
                    f"{ONECLICK_BASE_URL}/v0/status",
                    headers=self._get_headers(),
                    params={"depositAddress": deposit_address},
                )
                resp.raise_for_status()
                return resp.json()

        except httpx.HTTPStatusError as e:
            if e.response.status_code == 404:
                return {"status": "NOT_FOUND", "depositAddress": deposit_address}
            logger.error(f"Status check failed: {e.response.status_code}")
            raise IntentsServiceError(
                f"Status check failed: {e.response.status_code}",
                status_code=e.response.status_code,
            )
        except Exception as e:
            logger.error(f"Status check error: {e}")
            raise IntentsServiceError(f"Status check failed: {str(e)}")

    # -------------------------------------------------------------------------
    # Intent-based Prediction Payments
    # -------------------------------------------------------------------------

    async def request_prediction_payment_quote(
        self,
        origin_asset: str,
        amount: str,
        recipient_near_account: str,
        refund_to: str,
    ) -> Dict:
        """
        Get a quote for paying for an oracle prediction via cross-chain intent.
        The destination is always NEAR (wNEAR) since predictions are fulfilled on NEAR.

        Args:
            origin_asset: Source token asset ID (any supported chain)
            amount: Amount in smallest unit of origin token
            recipient_near_account: NEAR account to receive the payment (publisher contract)
            refund_to: Refund address on the origin chain
        """
        # Destination is always wNEAR on NEAR
        destination_asset = "nep141:wrap.near"

        return await self.request_quote(
            origin_asset=origin_asset,
            destination_asset=destination_asset,
            amount=amount,
            recipient=recipient_near_account,
            refund_to=refund_to,
            dry=True,
            deadline_minutes=15,
        )

    async def execute_prediction_payment(
        self,
        origin_asset: str,
        amount: str,
        recipient_near_account: str,
        refund_to: str,
    ) -> Dict:
        """
        Execute a cross-chain prediction payment.
        Returns deposit address for the user to send tokens to.
        """
        destination_asset = "nep141:wrap.near"

        return await self.execute_swap(
            origin_asset=origin_asset,
            destination_asset=destination_asset,
            amount=amount,
            recipient=recipient_near_account,
            refund_to=refund_to,
            deadline_minutes=15,
        )
