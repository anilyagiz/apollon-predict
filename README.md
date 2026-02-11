# Apollon - Multichain ZK Price Oracle

A privacy-enhanced multichain price prediction oracle for NEAR Protocol using Zero-Knowledge proofs, ensemble machine learning models, NEAR Intents for cross-chain interoperability, and a TEE-based Shade Agent for autonomous prediction fulfillment.

## Project Overview

Apollon is a **multichain oracle** between **NEAR** and **Solana** (planned) that combines:

- **Ensemble ML Models**: LSTM, GRU, Prophet, and XGBoost for robust price predictions
- **Multi-Source Data**: CoinGecko and CoinMarketCap price aggregation
- **Zero-Knowledge Privacy**: ZK-SNARK proof verification using snarkjs and arkworks
- **NEAR Intents**: Cross-chain token swaps and intent-based prediction payments (14+ chains)
- **Shade Agent**: Autonomous TEE-based oracle agent for prediction fulfillment
- **NEAR Smart Contracts**: Publisher, verifier, and agent contracts in Rust
- **Cross-Platform SDKs**: TypeScript and Python SDKs for easy integration

## Architecture

```
apollon/
├── contracts/
│   ├── publisher/           # NEAR oracle publisher contract (Rust)
│   ├── verifier/            # ZK proof verifier contract (Rust + arkworks)
│   └── agent/               # Shade Agent restriction contract (Rust)
├── sdk/
│   ├── typescript/          # TypeScript SDK (NEAR + Intents + Swaps)
│   └── python/              # Python SDK (NEAR + Intents + Swaps)
├── backend/
│   ├── api/                 # REST API server (FastAPI)
│   │   ├── server.py        # Main API with prediction, swap, intent, agent endpoints
│   │   └── intents_service.py  # NEAR Intents 1Click API client
│   ├── ml-engine/           # ML prediction models
│   ├── data-aggregator/     # Multi-source price data collection
│   ├── zk-privacy/          # Zero-Knowledge circuits (Circom)
│   └── shade-agent/         # Shade Agent (Hono + TypeScript)
│       ├── oracle-agent.ts  # Prediction fulfillment loop
│       ├── near-client.ts   # NEAR contract interactions
│       └── solana-client.ts # Solana integration (stub)
├── frontend/
│   └── algo-zk-dashboard/   # Next.js dashboard (Black theme)
│       ├── TokenSwap.tsx     # Cross-chain swap component
│       ├── IntentSwapPanel.tsx  # Prediction payment component
│       └── AgentStatus.tsx   # Oracle agent monitoring
└── docker-compose.yml       # Full stack orchestration
```

## Features

### Core Oracle
- ML ensemble price predictions (LSTM 35%, GRU 25%, Prophet 25%, XGBoost 15%)
- ZK-SNARK privacy for model weights and individual predictions
- Multi-source real-time price aggregation

### NEAR Intents Integration
- Cross-chain token swaps across 14+ blockchains
- Intent-based prediction payments from any chain
- Powered by the 1Click API (quote, deposit, status)

### Shade Agent
- Autonomous TEE-based oracle agent
- Watches for pending prediction requests on NEAR
- Calls ML API and fulfills predictions on-chain
- TEE remote attestation for verifiability
- Restricted to approved contract methods via agent contract

### Smart Contracts
- **Publisher**: Request/fulfill/cancel predictions with deposits
- **Verifier**: ZK-SNARK proof parsing and validation (arkworks)
- **Agent**: TEE-restricted signature requests and action allowlists

## Quick Start

### Prerequisites

- Docker & Docker Compose (recommended)
- Node.js 18+ / Python 3.11+
- Rust (for contract development)

### Using Docker (Recommended)

```bash
git clone https://github.com/anilyagiz/near-apollon.git
cd near-apollon

# Copy and configure environment
cp .env.example .env
# Edit .env with your NEAR account details

# Start all services
docker compose up --build
```

Services:
- **API**: http://localhost:8000
- **Frontend**: http://localhost:3000
- **Shade Agent**: http://localhost:3100
- **Redis**: localhost:6379

### Manual Setup

1. **Backend API:**

```bash
cd backend/api
pip install -r requirements.txt
python server.py
```

2. **Frontend:**

```bash
cd frontend/algo-zk-dashboard
npm install
npm run dev
```

3. **Shade Agent:**

```bash
cd backend/shade-agent
npm install
npm run dev
```

4. **Contracts:**

```bash
cd contracts/publisher
cargo test
cargo build --target wasm32-unknown-unknown --release

cd ../verifier
cargo test

cd ../agent
cargo build --target wasm32-unknown-unknown --release
```

## API Endpoints

### Prediction & Price

| Endpoint | Description |
| --- | --- |
| `GET /health` | API health and model status |
| `GET /price/near` | Current NEAR price (aggregated) |
| `POST /predict` | ML ensemble prediction |
| `POST /predict-zk` | ZK-enhanced prediction |
| `GET /models/status` | Model training status |

### Cross-Chain Swap (NEAR Intents)

| Endpoint | Description |
| --- | --- |
| `GET /swap/tokens?chain=` | Supported tokens (14+ chains) |
| `GET /swap/chains` | Supported blockchains |
| `POST /swap/quote` | Get swap quote |
| `POST /swap/execute` | Execute swap (returns deposit address) |
| `GET /swap/status/{addr}` | Swap execution status |
| `POST /swap/deposit` | Submit deposit tx hash |

### Intent Payments

| Endpoint | Description |
| --- | --- |
| `POST /intents/prediction/quote` | Quote for cross-chain prediction payment |
| `POST /intents/prediction/execute` | Execute cross-chain prediction payment |
| `GET /intents/status/{addr}` | Payment status |

### Oracle Agent

| Endpoint | Description |
| --- | --- |
| `GET /agent/status` | Shade Agent status |
| `GET /agent/attestation` | TEE remote attestation data |

## Smart Contracts

### Publisher Contract

```rust
// Request a prediction (user deposits NEAR)
pub fn request_prediction(&mut self, asset: String, timeframe: String, zk_required: bool) -> u64

// Fulfill a prediction (solver/agent)
pub fn fulfill_prediction(&mut self, request_id: u64, predicted_price: u64, zk_proof: Option<Vec<u8>>)

// Fulfill via registered Shade Agent
pub fn fulfill_prediction_via_agent(&mut self, request_id: u64, predicted_price: u64, zk_proof: Option<Vec<u8>>, agent_contract: AccountId)

// Cancel and get refund
pub fn cancel_request(&mut self, request_id: u64)
```

### Verifier Contract

```rust
// Parse and validate ZK proof
pub fn verify_proof(proof_json: &str) -> Result<bool, ProofParseError>
```

### Agent Contract

```rust
// Register TEE agent with attestation
pub fn register_agent(&mut self, code_hash: String, attestation_quote: Option<String>, tee_type: String)

// Request signature (restricted to allowed actions)
pub fn request_signature(&mut self, target_contract: AccountId, method_name: String, args: String) -> Promise
```

## SDK Usage

### TypeScript

```typescript
import { NearOracleClient } from "@apollon/oracle-sdk";

const client = new NearOracleClient({
  networkId: "testnet",
  publisherContract: "apollon-publisher.testnet",
  apiUrl: "http://localhost:8000",
});

await client.initialize();

// Request prediction
const requestId = await client.requestPrediction(
  { asset: "NEAR", timeframe: "24h", zkRequired: true },
  "0.1"
);

// Cross-chain swap
const quote = await client.getSwapQuote({
  originAsset: "nep141:wrap.near",
  destinationAsset: "solana:native",
  amount: "1000000000000000000000000",
  recipient: "YourSolanaAddress",
});

// Agent status
const agent = await client.getAgentStatus();
```

### Python

```python
from apollon_near_sdk import NearOracleClient, NearOracleConfig

config = NearOracleConfig(
    publisher_contract="apollon-publisher.testnet",
    api_url="http://localhost:8000",
)

client = NearOracleClient(config)
await client.initialize()

# Get pending requests
pending = await client.get_pending_requests(limit=10)

# Cross-chain swap quote
quote = await client.get_swap_quote(
    origin_asset="nep141:wrap.near",
    destination_asset="solana:native",
    amount="1000000000000000000000000",
    recipient="YourSolanaAddress",
)

# Agent status
agent = await client.get_agent_status()
```

## ML Models

### Ensemble Components

| Model | Weight | Strength |
| --- | --- | --- |
| LSTM | 35% | Sequential price patterns |
| GRU | 25% | Faster training, similar accuracy |
| Prophet | 25% | Trend and seasonality detection |
| XGBoost | 15% | Non-linear relationships |

## Zero-Knowledge Implementation

### ZK Flow

1. ML models generate price prediction
2. snarkjs creates Groth16 ZK proof (hiding model weights)
3. Proof submitted to NEAR publisher contract
4. Verifier contract validates proof with arkworks
5. Prediction accepted if proof valid

### Privacy Guarantees

- Model weights remain hidden (ZK-SNARKs)
- Individual model predictions are private
- Only the final ensemble price is revealed
- Proof of correct computation provided

## Tech Stack

- **Blockchain**: NEAR Protocol (primary), Solana (planned)
- **Smart Contracts**: Rust + near-sdk 5.x
- **ZK**: snarkjs + arkworks (Groth16, BN254)
- **Cross-Chain**: NEAR Intents (1Click API)
- **Agent**: Hono + TypeScript (TEE-compatible)
- **Frontend**: Next.js + TypeScript + Tailwind + Framer Motion
- **Backend**: Python (FastAPI) + ML (TensorFlow, Prophet, XGBoost)
- **Infra**: Docker Compose, Redis

## Testing

```bash
# Contract tests
cd contracts/verifier && cargo test
cd contracts/publisher && cargo test

# SDK tests
cd sdk/typescript && npm test
cd sdk/python && pytest

# Backend tests
cd backend/api && pytest
```

## Deployment

### Testnet

```bash
cp .env.example .env
# Configure NEAR testnet accounts

# Deploy contracts
./scripts/deploy-testnet.sh

# Start services
docker compose up --build
```

### Mainnet

```bash
export NEAR_NETWORK=mainnet
./scripts/deploy-mainnet.sh
```

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/new-feature`
3. Make changes and test
4. Commit: `git commit -m "feat: add new feature"`
5. Push and submit pull request

## License

MIT License - see LICENSE file for details.

## Acknowledgments

- **NEAR Protocol** - Blockchain infrastructure and Intents
- **snarkjs / arkworks** - ZK proof ecosystem
- **1Click API** - Cross-chain intent execution
- **Shade Protocol** - TEE agent framework inspiration

---

**Status**: Active Development

**Chains**: NEAR Protocol (live) | Solana (planned)

**Docs**: [SDK Documentation](./sdk/README.md)
