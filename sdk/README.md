# Apollon Oracle SDK

Official SDKs for the Apollon Multichain Price Oracle, providing easy integration with Zero-Knowledge enhanced price predictions on NEAR Protocol with cross-chain capabilities via NEAR Intents.

## Overview

The Apollon Oracle SDK enables developers to:

- **Generate Price Predictions**: Access ML-powered price predictions using ensemble models (LSTM, GRU, Prophet, XGBoost)
- **Privacy-Enhanced Predictions**: Generate predictions with Zero-Knowledge proofs for model weight privacy
- **Cross-Chain Token Swaps**: Execute cross-chain swaps via NEAR Intents (14+ chains supported)
- **Intent-Based Payments**: Pay for oracle predictions from any chain
- **Oracle Agent Monitoring**: Query Shade Agent status and TEE attestation
- **Real-time Price Data**: Get aggregated price data from multiple sources with confidence metrics
- **Technical Analysis**: Access technical indicators and historical price data
- **ZK Proof Verification**: Verify zero-knowledge proofs client-side
- **NEAR Contract Interaction**: Interact directly with publisher/verifier smart contracts

## Features

- **Zero-Knowledge Privacy**: Model weights and individual predictions remain hidden using ZK-SNARKs
- **NEAR Intents Integration**: Cross-chain swaps and intent-based prediction payments
- **Shade Agent Support**: Autonomous TEE-based oracle agent status and attestation
- **Multichain Architecture**: NEAR Protocol primary + Solana (planned)
- **High Performance**: ZK proof generation in ~350ms
- **Multiple Language Support**: TypeScript/JavaScript and Python SDKs
- **Comprehensive Error Handling**: Retry logic and proper error classification
- **Type Safety**: Full TypeScript support with comprehensive type definitions
- **Async/Await Pattern**: Modern async programming patterns in both languages

## Architecture

```
Apollon Multichain Price Oracle
├── Backend (FastAPI)
│   ├── ML Engine (LSTM, GRU, Prophet, XGBoost)
│   ├── ZK Privacy Layer (Circom + snarkjs)
│   ├── Data Aggregator (Multi-source price feeds)
│   ├── Intents Service (1Click API client)
│   └── REST API (Prediction, Swap, Intent endpoints)
├── Shade Agent (Hono + TypeScript)
│   ├── Oracle Agent (prediction fulfillment loop)
│   ├── NEAR Client (contract interactions)
│   ├── Solana Client (chain signatures, planned)
│   └── TEE Attestation
├── Smart Contracts (NEAR / Rust)
│   ├── Publisher (prediction requests + fulfillment)
│   ├── Verifier (ZK proof verification)
│   └── Agent (TEE-restricted signature requests)
├── SDK
│   ├── TypeScript/JavaScript SDK
│   │   ├── NEAR contract client
│   │   ├── Swap/Intent methods
│   │   ├── ZK proof verification
│   │   └── Error handling
│   └── Python SDK
│       ├── NEAR RPC client
│       ├── Swap/Intent methods
│       ├── Pydantic models
│       └── Exception handling
└── Examples & Documentation
```

## Available SDKs

### TypeScript/JavaScript SDK

**Path**: `./typescript/`
**Package**: `@apollon/oracle-sdk`

Features:

- Full TypeScript support with type definitions
- NEAR wallet integration and contract interaction
- Cross-chain swap and intent-based payment methods
- ZK proof verification using snarkjs
- Agent status and TEE attestation queries
- Browser and Node.js compatible

**Installation** (when published):

```bash
npm install @apollon/oracle-sdk
```

**Usage**:

```typescript
import { NearOracleClient } from "@apollon/oracle-sdk";

const client = new NearOracleClient({
  networkId: "testnet",
  publisherContract: "apollon-publisher.testnet",
  apiUrl: "http://localhost:8000",
});

await client.initialize();

// Request a prediction on NEAR
const requestId = await client.requestPrediction({
  asset: "NEAR",
  timeframe: "24h",
  zkRequired: true,
});

// Cross-chain swap via NEAR Intents
const quote = await client.getSwapQuote({
  originAsset: "nep141:wrap.near",
  destinationAsset: "solana:native",
  amount: "1000000000000000000000000",
  recipient: "YourSolanaAddress",
});

// Pay for a prediction from any chain
const payment = await client.executePredictionPayment({
  originAsset: "nep141:usdt.tether-token.near",
  amount: "1000000",
  refundTo: "your-account.near",
});

// Check agent status
const agentStatus = await client.getAgentStatus();
console.log(`Agent: ${agentStatus.status}, Fulfilled: ${agentStatus.total_fulfilled}`);
```

### Python SDK

**Path**: `./python/`
**Package**: `apollon-oracle-sdk`

Features:

- Async and synchronous client interfaces
- NEAR RPC client (no native dependency issues)
- Cross-chain swap and intent payment methods
- Pydantic models for type safety
- httpx-based HTTP client
- Python 3.8+ support

**Installation** (when published):

```bash
pip install apollon-oracle-sdk
```

**Usage**:

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
        print(f"Request #{r.request_id}: {r.asset} ({r.status})")

    # Cross-chain swap
    quote = await client.get_swap_quote(
        origin_asset="nep141:wrap.near",
        destination_asset="solana:native",
        amount="1000000000000000000000000",
        recipient="YourSolanaAddress",
    )

    # Agent status
    agent = await client.get_agent_status()
    print(f"Agent: {agent['status']}, Fulfilled: {agent['total_fulfilled']}")

    await client.close()

asyncio.run(main())
```

## API Endpoints Covered

Both SDKs provide methods for all available API endpoints:

**Core Oracle Endpoints:**

- `/health` - Check API health and model status
- `/price/near` - Get current NEAR price
- `/price/technicals` - Get technical analysis indicators
- `/price/historical` - Get historical price data
- `/predict` - Generate standard ML prediction
- `/predict-zk` - Generate ZK-enhanced prediction
- `/verify-zk` - Verify ZK proof independently
- `/models/status` - Get model training status

**Swap / Intent Endpoints (NEAR Intents):**

- `/swap/tokens` - Get supported tokens (14+ chains)
- `/swap/chains` - Get supported blockchains
- `/swap/quote` - Get cross-chain swap quote
- `/swap/execute` - Execute a swap (returns deposit address)
- `/swap/status/{addr}` - Check swap execution status
- `/swap/deposit` - Submit deposit tx hash
- `/intents/prediction/quote` - Quote for cross-chain prediction payment
- `/intents/prediction/execute` - Execute cross-chain prediction payment
- `/intents/status/{addr}` - Check intent payment status

**Agent Endpoints:**

- `/agent/status` - Get Shade Agent oracle status
- `/agent/attestation` - Get TEE remote attestation data

**NEAR Contract Methods (via SDK):**

- `request_prediction` - Submit a prediction request with deposit
- `get_request` - View a specific request
- `get_pending_requests` - List pending requests
- `cancel_request` - Cancel your request (refund)
- `fulfill_prediction` - Fulfill a prediction (solver)
- `fulfill_prediction_via_agent` - Agent-based fulfillment

## ZK Proof System

The SDK includes built-in support for Zero-Knowledge proof verification:

### Privacy Features

- **Model Weights Hidden**: Individual model weights (LSTM: 35%, GRU: 25%, Prophet: 25%, XGBoost: 15%) are never revealed
- **Individual Predictions Hidden**: Predictions from each model remain private
- **Ensemble Verification**: ZK proof confirms correct weighted average calculation
- **Circuit Verification**: Cryptographic proof of computation integrity

### Performance

- **Proof Generation**: ~350ms (optimized from initial 5+ minutes)
- **Proof Verification**: <100ms client-side verification
- **Groth16 System**: Efficient zero-knowledge proving system
- **Integer Arithmetic**: Precise financial calculations with proper constraints

## Cross-Chain Architecture

Apollon supports cross-chain interactions via NEAR Intents:

- **14+ chains**: NEAR, Solana, Ethereum, Arbitrum, Base, Polygon, Avalanche, BSC, Optimism, Aurora, Bitcoin, TON, XRP, and more
- **Token Swaps**: Any-to-any token swaps across supported chains
- **Prediction Payments**: Pay for oracle predictions from any chain (settled as wNEAR)
- **Shade Agent**: Autonomous TEE-based oracle that fulfills predictions on-chain

## Error Handling

Both SDKs include comprehensive error handling:

### Error Types

- **NetworkError**: Connection and HTTP errors
- **ValidationError**: Request validation failures
- **ModelNotReadyError**: ML models still training
- **ZKVerificationError**: ZK proof verification failures
- **RateLimitError**: API rate limiting
- **IntentsServiceError**: Cross-chain swap/intent failures

### Retry Logic

- **Exponential Backoff**: Configurable retry delays
- **Smart Retries**: Only retry retryable errors
- **Circuit Breaking**: Fail fast on non-retryable errors

## Development Setup

### Prerequisites

- Node.js 18+ (for TypeScript SDK)
- Python 3.8+ (for Python SDK)
- Running Apollon Oracle API (port 8000)

### Local Development

1. **Clone Repository**:

```bash
git clone https://github.com/YourOrg/near-apollon
cd near-apollon/sdk
```

2. **TypeScript SDK**:

```bash
cd typescript
npm install
npm run build
npm test
```

3. **Python SDK**:

```bash
cd python
pip install -e .
python examples/basic_usage.py
```

## Examples

Comprehensive examples are provided for both SDKs:

- **TypeScript**: `./typescript/examples/basic-usage.ts`
- **Python**: `./python/examples/basic_usage.py`

Each example demonstrates:

- Client initialization and configuration
- Health checking and model readiness
- Price data retrieval
- Standard and ZK-enhanced predictions
- Cross-chain swap quotes and execution
- Intent-based prediction payments
- Agent status monitoring
- Error handling patterns

## Security Considerations

### ZK Privacy Guarantees

- **Zero-Knowledge**: No information about model weights or individual predictions is leaked
- **Computational Integrity**: Cryptographic proof that ensemble calculation is correct
- **Tamper Evidence**: Any modification to the proof or public signals invalidates verification

### TEE Attestation (Shade Agent)

- **Remote Attestation**: Verify that the oracle agent runs correct code in a TEE
- **Restricted Actions**: Agent contract limits what the TEE agent can do
- **Code Hash Verification**: Published code hash matches TEE measurement

### Network Security

- **HTTPS Support**: Secure communication with API endpoints
- **Timeout Protection**: Configurable request timeouts
- **Rate Limiting**: Built-in retry logic respects API rate limits

## Contributing

1. **Issues**: Report bugs and feature requests on GitHub
2. **Pull Requests**: Follow TypeScript/Python best practices
3. **Testing**: Add tests for new features
4. **Documentation**: Update README and inline documentation

## License

MIT License - see LICENSE file for details

---

**Built with privacy-first principles using Zero-Knowledge cryptography for the NEAR ecosystem**
