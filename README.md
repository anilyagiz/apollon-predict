# Apollon - NEAR ZK Oracle

A privacy-enhanced price prediction oracle for NEAR Protocol using Zero-Knowledge proofs and ensemble machine learning models.

## Project Overview

This project implements a sophisticated price prediction oracle on NEAR Protocol that combines:

- **Ensemble ML Models**: LSTM, GRU, Prophet, and XGBoost for robust predictions
- **Multi-Source Data**: CoinGecko and CoinMarketCap price aggregation
- **Zero-Knowledge Privacy**: ZK-SNARK proof verification using snarkjs and arkworks
- **NEAR Integration**: Native smart contracts with Rust
- **Cross-Platform SDKs**: TypeScript and Python SDKs for easy integration

## Architecture

```
apollon/
├── contracts/
│   ├── publisher/           # NEAR oracle publisher contract (Rust)
│   └── verifier/            # ZK proof verifier contract (Rust + arkworks)
├── sdk/
│   ├── typescript/          # TypeScript SDK for NEAR integration
│   └── python/              # Python SDK (Python 3.12+ compatible)
├── backend/
│   ├── api/                 # REST API server (FastAPI)
│   ├── ml-engine/           # ML prediction models
│   ├── data-aggregator/     # Multi-source price data collection
│   └── zk-privacy/          # Zero-Knowledge circuits (Circom)
├── frontend/
│   └── algo-zk-dashboard/   # Next.js prediction dashboard (Black theme)
└── scripts/                 # Deployment scripts
```

## Current Status

### Implemented Features

- [x] **NEAR Smart Contracts**
  - Publisher contract with request/fulfill/cancel functionality
  - Verifier contract with snarkjs proof parsing (arkworks integration)
  - Admin functions and event emission
  - 13/13 tests passing

- [x] **SDKs**
  - TypeScript SDK with full NEAR integration
  - Python SDK (Python 3.12+ compatible, httpx-based)
  - fulfillPrediction method for solvers

- [x] **Frontend**
  - Black/minimalist UI theme
  - Real-time NEAR price display (CoinGecko API)
  - Interactive prediction charts
  - NEAR Wallet integration ready

- [x] **Backend**
  - Mock API server for development
  - ML ensemble prediction engine
  - Price aggregation from multiple sources

## Quick Start

### Prerequisites

- Node.js 18+
- Python 3.12+
- Rust (for contract development)
- NEAR CLI (optional, for deployment)

### Installation

1. **Clone the repository:**

```bash
git clone https://github.com/anilyagiz/near-apollon.git
cd near-apollon
```

2. **Install contract dependencies:**

```bash
# Rust contracts
cd contracts/publisher
cargo check --target wasm32-unknown-unknown

cd ../verifier
cargo test  # 13/13 tests passing
```

3. **Install SDKs:**

```bash
# TypeScript SDK
cd sdk/typescript
npm install
npm run build

# Python SDK
cd ../python
pip install -e .
```

4. **Start the backend mock server:**

```bash
cd backend
python mock_server.py
```

The API will be available at `http://localhost:8000`

5. **Start the frontend:**

```bash
cd frontend/algo-zk-dashboard
npm install
npm run dev -- --port 3001
```

Visit `http://localhost:3001`

## Smart Contracts

### Publisher Contract

Handles prediction requests and fulfillment:

```rust
pub fn request_prediction(&mut self, asset: String, timeframe: String, zk_required: bool) -> u64
pub fn fulfill_prediction(&mut self, request_id: u64, predicted_price: u64, zk_proof: Option<Vec<u8>>)
pub fn cancel_request(&mut self, request_id: u64)
```

**Events:**
- `PredictionRequested`
- `PredictionFulfilled`
- `PredictionCancelled`

### Verifier Contract

Parses and validates snarkjs ZK proofs:

```rust
pub fn parse_proof(&self, proof_json: String) -> Result<ArkworksProof, ProofParseError>
```

Supports both decimal and hex field element formats.

## SDK Usage

### TypeScript

```typescript
import { NearOracleClient } from '@apollon/near-sdk';

const client = new NearOracleClient({
  networkId: 'testnet',
  publisherContract: 'apollon-publisher.testnet',
  verifierContract: 'apollon-verifier.testnet'
});

await client.initialize();

// Request prediction
const requestId = await client.requestPrediction({
  asset: 'NEAR',
  timeframe: '24h',
  zkRequired: true
}, '0.1');

// Get request status
const request = await client.getRequest(requestId);
```

### Python

```python
from apollon_near_sdk import NearOracleClient, NearOracleConfig

config = NearOracleConfig(
    network_id="testnet",
    publisher_contract="apollon-publisher.testnet"
)

client = NearOracleClient(config)
await client.initialize()

# Get pending requests
pending = await client.get_pending_requests(limit=10)
```

## Frontend

### Black/Minimalist Theme

The frontend features a clean black theme with white text:
- Background: `bg-black`
- Cards: `bg-neutral-900` with `border-neutral-800`
- Text: White and neutral gray tones
- No colorful gradients

### NEAR Price Display

Real-time NEAR price from CoinGecko API:
- Current price
- 24h volume
- Price change percentage

## ML Models

### Ensemble Components

1. **LSTM (Long Short-Term Memory)**
   - Weight: 35%
   - Best for: Sequential price patterns

2. **GRU (Gated Recurrent Unit)**
   - Weight: 25%
   - Best for: Faster training

3. **Prophet (Facebook's time series)**
   - Weight: 25%
   - Best for: Trend and seasonality

4. **XGBoost (Gradient Boosting)**
   - Weight: 15%
   - Best for: Non-linear relationships

## Zero-Knowledge Implementation

### Current Features

- **snarkjs Integration**: Proof parsing from browser/node
- **arkworks**: Rust-side proof validation
- **Groth16**: Verification algorithm
- **BN254 Curve**: Ethereum/NEAR compatible

### ZK Flow

1. ML models generate prediction
2. snarkjs creates ZK proof
3. Proof submitted to NEAR contract
4. Verifier contract validates with arkworks
5. Prediction accepted if proof valid

## Deployment

### Testnet

```bash
# Deploy contracts
./scripts/deploy-testnet.sh

# Build and deploy frontend
vercel --prod
```

### Mainnet

```bash
# Update network in scripts
export NETWORK=mainnet

# Deploy
./scripts/deploy-mainnet.sh
```

## Testing

```bash
# Contract tests
cd contracts/verifier
cargo test

# SDK tests
cd sdk/typescript
npm test

cd sdk/python
pytest

# Integration tests
cd tests
pytest integration/
```

## Performance

- **Contract Tests**: 13/13 passing
- **ZK Proof Parsing**: <100ms
- **API Response**: <500ms
- **Frontend Build**: 162 kB

## Tech Stack

- **Blockchain**: NEAR Protocol
- **Smart Contracts**: Rust + near-sdk-rs
- **ZK**: snarkjs + arkworks
- **Frontend**: Next.js + TypeScript + Tailwind
- **Backend**: Python (FastAPI)
- **ML**: TensorFlow, Prophet, XGBoost

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/new-feature`
3. Make changes and test
4. Commit: `git commit -m "feat: add new feature"`
5. Push: `git push origin feature/new-feature`
6. Submit pull request

## License

MIT License - see LICENSE file for details.

## Acknowledgments

- **NEAR Protocol**: Blockchain infrastructure
- **snarkjs**: ZK proof generation
- **arkworks**: Rust ZK library
- **CryptoPredictions**: ML models inspiration

---

**Status**: Production Ready - NEAR oracle with ZK verification

**Live Demo**: Coming soon

**Docs**: [Full Documentation](./docs)
