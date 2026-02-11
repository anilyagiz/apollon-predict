# Apollon Oracle Python SDK

Python SDK for the Apollon Multichain Price Oracle on NEAR Protocol with Zero-Knowledge proof verification and cross-chain capabilities via NEAR Intents.

## Installation

```bash
pip install apollon-oracle-sdk
```

## Quick Start

### Async Usage (Recommended)

```python
import asyncio
from apollon_near_sdk import NearOracleClient, NearOracleConfig

async def main():
    config = NearOracleConfig(
        publisher_contract="apollon-publisher.testnet",
        api_url="http://localhost:8000",
    )

    client = NearOracleClient(config)
    await client.initialize()

    # Get pending prediction requests
    requests = await client.get_pending_requests(limit=5)
    for r in requests:
        print(f"Request #{r.request_id}: {r.asset} / {r.timeframe} ({r.status})")

    # Cross-chain swap quote
    quote = await client.get_swap_quote(
        origin_asset="nep141:wrap.near",
        destination_asset="solana:native",
        amount="1000000000000000000000000",
        recipient="YourSolanaAddress",
    )
    print(f"You receive: {quote['quote']['amountOutFormatted']}")

    # Agent status
    agent = await client.get_agent_status()
    print(f"Agent: {agent['status']}, Fulfilled: {agent['total_fulfilled']}")

    await client.close()

asyncio.run(main())
```

### Synchronous Usage

```python
from apollon_near_sdk import NearOracleClientSync, NearOracleConfig

config = NearOracleConfig(
    publisher_contract="apollon-publisher.testnet",
    api_url="http://localhost:8000",
)

client = NearOracleClientSync(config)
client.initialize()

try:
    # Get pending requests
    requests = client.get_pending_requests(limit=5)
    for r in requests:
        print(f"#{r.request_id}: {r.asset} ({r.status})")

    # Get swap chains
    chains = client.get_swap_chains()
    print(f"Supported chains: {[c['name'] for c in chains]}")

    # Agent status
    agent = client.get_agent_status()
    print(f"Agent: {agent['status']}")
finally:
    client.close()
```

### Legacy API Client

```python
import asyncio
from algo_zk_oracle import AlgoZKOracleClient, SDKConfig

async def main():
    config = SDKConfig(base_url="http://localhost:8000")

    async with AlgoZKOracleClient(config) as client:
        prediction = await client.predict_with_zk()
        print(f"Predicted price: ${prediction.predicted_price:.6f}")

asyncio.run(main())
```

## Features

- **NEAR Contract Integration**: Read prediction requests and contract state via RPC
- **Cross-Chain Swaps**: Token swaps across 14+ chains via NEAR Intents
- **Intent Payments**: Pay for predictions from any chain
- **Zero-Knowledge Privacy**: Model weights and predictions remain hidden
- **Type Safety**: Full Pydantic model support with type validation
- **Async/Sync Support**: Both asynchronous and synchronous client interfaces
- **Agent Monitoring**: Query Shade Agent status and TEE attestation
- **Error Handling**: Comprehensive error classification and retry logic
- **Python 3.8+**: Compatible with modern Python versions

## API Reference

### NearOracleClient (NEAR + Intents)

Primary client for NEAR contract interactions and cross-chain operations.

#### Configuration

```python
from apollon_near_sdk import NearOracleConfig

config = NearOracleConfig(
    network_id="testnet",                                     # NEAR network
    node_url="https://rpc.testnet.near.org",                  # NEAR RPC URL
    publisher_contract="apollon-publisher.testnet",            # Publisher contract
    verifier_contract="apollon-verifier.testnet",              # Verifier contract
    api_url="http://localhost:8000",                           # Backend API URL
)
```

#### NEAR Contract Methods

```python
# Initialize client
client = NearOracleClient(config)
await client.initialize(account_id="optional-account.near")

# Read prediction requests
request = await client.get_request(request_id=42)
pending = await client.get_pending_requests(limit=10)
contract_config = await client.get_contract_config()

# Close client
await client.close()
```

#### Cross-Chain Swap Methods

```python
# Token discovery
tokens = await client.get_swap_tokens(chain="near")
chains = await client.get_swap_chains()

# Swap execution
quote = await client.get_swap_quote(
    origin_asset="nep141:wrap.near",
    destination_asset="solana:native",
    amount="1000000000000000000000000",
    recipient="YourSolanaAddress",
    slippage_tolerance=100,  # 1% in basis points
)

result = await client.execute_swap(
    origin_asset="nep141:wrap.near",
    destination_asset="solana:native",
    amount="1000000000000000000000000",
    recipient="YourSolanaAddress",
)
print(f"Deposit to: {result['quote']['depositAddress']}")

# Check status
status = await client.get_swap_status(deposit_address)
```

#### Intent Payment Methods

```python
# Pay for predictions from any chain
quote = await client.get_prediction_payment_quote(
    origin_asset="nep141:usdt.tether-token.near",
    amount="1000000",
    refund_to="your-account.near",
)

result = await client.execute_prediction_payment(
    origin_asset="nep141:usdt.tether-token.near",
    amount="1000000",
    refund_to="your-account.near",
)
```

#### Agent Methods

```python
# Shade Agent status
agent = await client.get_agent_status()
print(f"Status: {agent['status']}")
print(f"Fulfilled: {agent['total_fulfilled']}")
print(f"TEE: {agent.get('tee_attestation', 'N/A')}")
```

### NearOracleClientFull (with Signing)

Extended client with transaction signing capabilities for solvers/agents.

```python
from apollon_near_sdk import NearOracleClientFull

client = NearOracleClientFull(config)
await client.initialize_with_signer(
    account_id="solver.near",
    private_key="ed25519:YOUR_PRIVATE_KEY",
)

# Fulfill a prediction
await client.fulfill_prediction(
    request_id=42,
    predicted_price=520_000,  # $5.20 with 6 decimals
    zk_proof=proof_bytes,
)
```

### AlgoZKOracleClient (Legacy API Client)

HTTP client for direct API interaction with ML prediction endpoints.

```python
from algo_zk_oracle import AlgoZKOracleClient, SDKConfig

config = SDKConfig(base_url="http://localhost:8000")

async with AlgoZKOracleClient(config) as client:
    health = await client.health()
    price = await client.get_current_price()
    prediction = await client.predict()
    zk_prediction = await client.predict_with_zk()
    status = await client.get_model_status()
```

## Error Handling

```python
from algo_zk_oracle import (
    AlgoZKOracleError,
    NetworkError,
    ValidationError,
    ZKVerificationError,
    ModelNotReadyError,
    RateLimitError,
)

try:
    prediction = await client.predict_with_zk()
except ModelNotReadyError:
    print("Models are still training, waiting...")
    await client.wait_for_models()
except NetworkError as e:
    print(f"Network error: {e.message}")
except AlgoZKOracleError as e:
    print(f"SDK error [{e.code}]: {e.message}")
```

## Examples

### Cross-Chain Swap

```python
async def cross_chain_swap():
    config = NearOracleConfig(
        publisher_contract="apollon-publisher.testnet",
        api_url="http://localhost:8000",
    )
    client = NearOracleClient(config)
    await client.initialize()

    # Get available chains
    chains = await client.get_swap_chains()
    print("Supported chains:", [c["name"] for c in chains])

    # Quote NEAR -> Solana USDT
    quote = await client.get_swap_quote(
        origin_asset="nep141:wrap.near",
        destination_asset="solana:es9vmfrzacermjfrf4h2fyd4kconky11mcce8benwnyb",
        amount="5000000000000000000000000",  # 5 NEAR
        recipient="YourSolanaAddress",
    )
    print(f"You receive: {quote['quote']['amountOutFormatted']} USDT")

    # Execute
    result = await client.execute_swap(
        origin_asset="nep141:wrap.near",
        destination_asset="solana:es9vmfrzacermjfrf4h2fyd4kconky11mcce8benwnyb",
        amount="5000000000000000000000000",
        recipient="YourSolanaAddress",
    )
    deposit_addr = result["quote"]["depositAddress"]
    print(f"Deposit to: {deposit_addr}")

    # Poll for completion
    import time
    while True:
        status = await client.get_swap_status(deposit_addr)
        print(f"Status: {status['status']}")
        if status["status"] in ("SUCCESS", "FAILED", "REFUNDED"):
            break
        time.sleep(5)

    await client.close()
```

### Price Monitoring with Predictions

```python
async def monitor():
    config = NearOracleConfig(
        publisher_contract="apollon-publisher.testnet",
        api_url="http://localhost:8000",
    )
    client = NearOracleClient(config)
    await client.initialize()

    # Check pending predictions
    pending = await client.get_pending_requests(limit=10)
    print(f"Pending requests: {len(pending)}")

    for req in pending:
        print(f"  #{req.request_id}: {req.asset}/{req.timeframe} - {req.status}")

    # Check agent
    agent = await client.get_agent_status()
    print(f"Oracle Agent: {agent['status']}")
    print(f"  Total fulfilled: {agent['total_fulfilled']}")
    print(f"  Chains: {agent.get('chains', ['near'])}")

    await client.close()
```

## Development

### Setup Development Environment

```bash
git clone https://github.com/YourOrg/near-apollon
cd near-apollon/sdk/python

# Install in development mode
pip install -e .[dev]
```

### Running Tests

```bash
pytest
```

### Code Formatting

```bash
black apollon_near_sdk/ algo_zk_oracle/
isort apollon_near_sdk/ algo_zk_oracle/
```

### Type Checking

```bash
mypy apollon_near_sdk/ algo_zk_oracle/
```

## License

MIT License
