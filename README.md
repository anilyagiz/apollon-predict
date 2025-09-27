# Apollon - ZK Oracle

**Privacy-Enhanced Machine Learning Price Prediction System for Algorand Blockchain**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.8+](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/downloads/)
[![Node.js 18+](https://img.shields.io/badge/node.js-18+-green.svg)](https://nodejs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104+-009688.svg)](https://fastapi.tiangolo.com/)

## Overview

Apollon - ZK Oracle is a cutting-edge price prediction system that combines machine learning with zero-knowledge cryptography to provide privacy-enhanced predictions for Algorand (ALGO) cryptocurrency prices. The system uses an ensemble of ML models while keeping model weights and individual predictions completely private through ZK-SNARK proofs.

### Key Features

- **Zero-Knowledge Privacy**: Model weights and individual predictions remain completely hidden
- **ML Ensemble**: 4-model prediction system (LSTM, GRU, Prophet, XGBoost)
- **Real-time Data**: Multi-source price aggregation from CoinLore, Binance, CoinGecko
- **Fast ZK Proofs**: ~350ms proof generation (500x performance improvement)
- **Multi-language SDKs**: TypeScript/JavaScript and Python clients

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Data Sources  │    │   ML Ensemble    │    │  ZK Privacy     │
│                 │    │                  │    │                 │
│ • CoinLore      │───▶│ • LSTM (35%)     │───▶│ • Circom        │
│ • Binance       │    │ • GRU (25%)      │    │ • snarkjs       │
│ • CoinGecko     │    │ • Prophet (25%)  │    │ • Groth16       │
│ • Fallbacks     │    │ • XGBoost (15%)  │    │ • Proof Gen     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────────────────────────────────────────────────────┐
│                     FastAPI Backend                            │
│                                                                 │
│  • REST API Endpoints     • Authentication & Security          │
│  • Real-time Predictions  • Error Handling & Monitoring        │
│  • ZK Proof Integration   • Performance Optimization           │
└─────────────────────────────────────────────────────────────────┘
         │                        │                        │
         ▼                        ▼                        ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ TypeScript SDK  │    │   Python SDK     │    │ Web Dashboard   │
│                 │    │                  │    │                 │
│ • Browser       │    │ • Async/Sync     │    │ • Next.js       │
│ • Node.js       │    │ • Pydantic       │    │ • Real-time     │
│ • Type Safety   │    │ • Error Handling │    │ • Visualizations│
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## Quick Start

### Prerequisites

- **Python 3.8+** for backend and Python SDK
- **Node.js 18+** for ZK proofs and TypeScript SDK
- **Git** for cloning the repository

### Installation

```bash
# Clone the repository
git clone https://github.com/oguzhaangumuss/algo-price-predict.git
cd algo-price-predict

# Install backend dependencies
cd backend
pip install -r requirements.txt

# Install ZK dependencies
cd zk-privacy
npm install

# Start the API server
cd ../api
python3 server.py
```

The API will be available at `http://localhost:8000`

### Basic Usage

#### REST API

```bash
# Check system health
curl http://localhost:8000/health

# Get current price
curl http://localhost:8000/price/current

# Generate prediction
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"symbol": "ALGOUSD", "timeframe": "24h"}'

# Generate ZK-enhanced prediction
curl -X POST http://localhost:8000/predict-zk \
  -H "Content-Type: application/json" \
  -d '{"symbol": "ALGOUSD", "timeframe": "24h"}'
```

#### TypeScript SDK

```typescript
import { Apollon - ZK OracleClient } from "@Apollon - ZK Oracle/oracle-sdk";

const client = new Apollon - ZK OracleClient({
  baseURL: "http://localhost:8000",
  enableZKVerification: true,
});

// Generate ZK-enhanced prediction
const prediction = await client.predictWithZK({
  symbol: "ALGOUSD",
  timeframe: "24h",
});

console.log(`Price: $${prediction.predicted_price}`);
console.log(`Privacy: ${prediction.privacy_status.model_weights_hidden}`);
```

#### Python SDK

```python
import asyncio
from Apollon - ZK Oracle import Apollon - ZK OracleClient, SDKConfig

async def main():
    config = SDKConfig(base_url="http://localhost:8000")

    async with Apollon - ZK OracleClient(config) as client:
        # Generate ZK-enhanced prediction
        prediction = await client.predict_with_zk()

        print(f"Price: ${prediction.predicted_price:.6f}")
        print(f"Privacy: {prediction.privacy_status.model_weights_hidden}")

asyncio.run(main())
```

## Zero-Knowledge Privacy

Apollon - ZK Oracle uses ZK-SNARKs to provide cryptographic privacy guarantees:

### What's Hidden

- **Model Weights**: Individual model contributions (35%, 25%, 25%, 15%) are never revealed
- **Individual Predictions**: Each model's prediction remains private
- **Training Data**: Historical data patterns used for training

### What's Verified

- **Correct Computation**: ZK proof confirms the ensemble calculation is mathematically correct
- **Model Integrity**: Cryptographic guarantee that the prediction follows the claimed methodology
- **No Tampering**: Any modification to weights or predictions invalidates the proof

### Performance

- **Proof Generation**: ~350ms (optimized from 5+ minutes)
- **Proof Verification**: <100ms client-side
- **Circuit Compilation**: One-time setup (~2 seconds)

## API Endpoints

### Core Endpoints

| Endpoint            | Method | Description                       |
| ------------------- | ------ | --------------------------------- |
| `/health`           | GET    | System health and model status    |
| `/price/current`    | GET    | Real-time aggregated price        |
| `/price/technicals` | GET    | Technical indicators              |
| `/predict`          | POST   | Standard ML prediction            |
| `/predict-zk`       | POST   | Privacy-enhanced prediction       |
| `/verify-zk`        | POST   | Independent ZK proof verification |

### Response Examples

**Health Check:**

```json
{
  "status": "healthy",
  "models_trained": true,
  "timestamp": "2025-09-27T22:30:00.000Z"
}
```

**Current Price:**

```json
{
  "aggregated_price": 0.205034,
  "confidence": 0.9997,
  "source_count": 3,
  "sources": [
    {
      "source": "coinlore",
      "price": 0.204826,
      "timestamp": "2025-09-27T22:30:00.000Z"
    }
  ]
}
```

**ZK Prediction:**

```json
{
  "predicted_price": 0.208691,
  "confidence": 0.347,
  "price_change_percent": 1.02,
  "privacy_status": {
    "model_weights_hidden": true,
    "individual_predictions_hidden": true,
    "circuit_verified": true
  },
  "zk_proof": {
    "verified": true,
    "public_signals": ["208"]
  }
}
```

## SDKs

### TypeScript/JavaScript SDK

**Installation:**

```bash
npm install @Apollon - ZK Oracle/oracle-sdk
```

**Features:**

- Full TypeScript support with type definitions
- Browser and Node.js compatibility
- ZK proof verification using snarkjs
- Comprehensive error handling and retry logic
- Async/await patterns

### Python SDK

**Installation:**

```bash
pip install Apollon - ZK Oracle-sdk
```

**Features:**

- Async and synchronous client interfaces
- Pydantic models for type safety
- httpx-based HTTP client
- Comprehensive retry and error handling
- Python 3.8+ support

## Machine Learning Models

The system uses an ensemble of 4 specialized models:

### Model Weights

- **LSTM (35%)**: Long Short-Term Memory neural network for sequence learning
- **GRU (25%)**: Gated Recurrent Unit for efficient sequence processing
- **Prophet (25%)**: Facebook's time series forecasting with seasonality
- **XGBoost (15%)**: Gradient boosting for pattern recognition

### Features Used

- Technical indicators (RSI, Bollinger Bands, Moving Averages)
- Price lag features (1, 2, 3 periods back)
- Volume indicators and ratios
- Time-based features (hour, day of week, seasonality)
- Volatility measurements

### Training Process

- **Data Sources**: Multi-source historical price aggregation
- **Training Frequency**: Adaptive retraining based on performance
- **Validation**: Time-series cross-validation
- **Performance Monitoring**: Real-time accuracy tracking

## Development

### Project Structure

```
algo-price-predict/
├── backend/
│   ├── api/                 # FastAPI server
│   ├── data-aggregator/     # Price data collection
│   ├── ml-engine/          # ML models and ensemble
│   ├── oracle-core/        # Algorand integration
│   └── zk-privacy/         # ZK proof system
├── sdk/
│   ├── typescript/         # TypeScript SDK
│   └── python/            # Python SDK
├── frontend/
│   └── algo-zk-dashboard/  # Next.js dashboard
├── docs/                   # Documentation
└── tests/                 # Test suites
```

### Running Tests

```bash
# Backend tests
python test_system.py

# SDK tests
cd sdk-test/python-test && python test_async_only.py
cd sdk-test/typescript-test && node simple-test.js

# ZK system tests
cd backend/zk-privacy && node proof_generator.js
```

### Performance Benchmarks

| Operation              | Response Time | Notes                      |
| ---------------------- | ------------- | -------------------------- |
| Health Check           | <50ms         | System status              |
| Current Price          | <200ms        | Multi-source aggregation   |
| Standard Prediction    | <500ms        | 4-model ensemble           |
| ZK-Enhanced Prediction | <1500ms       | Including proof generation |
| ZK Proof Verification  | <100ms        | Client-side verification   |

## Deployment

### Docker (Recommended)

```bash
# Build and run with Docker Compose
docker-compose up -d

# The API will be available at http://localhost:8000
```

### Manual Deployment

```bash
# Production environment variables
export ENVIRONMENT=production
export LOG_LEVEL=info
export API_HOST=0.0.0.0
export API_PORT=8000

# Start with production server
cd backend/api
uvicorn server:app --host 0.0.0.0 --port 8000 --workers 4
```

### Environment Variables

| Variable       | Default       | Description                |
| -------------- | ------------- | -------------------------- |
| `ENVIRONMENT`  | `development` | Environment mode           |
| `LOG_LEVEL`    | `info`        | Logging level              |
| `API_HOST`     | `localhost`   | API bind host              |
| `API_PORT`     | `8000`        | API bind port              |
| `CORS_ORIGINS` | `["*"]`       | CORS allowed origins       |
| `ZK_TIMEOUT`   | `30`          | ZK proof timeout (seconds) |

## Contributing

We welcome contributions! Please see our [Contributing Guide](./guides/contributing.md) for details.

### Development Setup

```bash
# Clone and setup development environment
git clone https://github.com/oguzhaangumuss/algo-price-predict.git
cd algo-price-predict

# Install pre-commit hooks
pip install pre-commit
pre-commit install

# Run development server
cd backend/api
python server.py
```

### Code Style

- **Python**: Black formatter, flake8 linting
- **TypeScript**: ESLint + Prettier
- **Commit Messages**: Conventional commits format

## Security

### Privacy Guarantees

- **Zero-Knowledge Proofs**: Cryptographic privacy for model weights
- **No Data Retention**: Historical predictions not stored long-term
- **Secure Communication**: HTTPS enforced in production

### Reporting Security Issues

Please report security vulnerabilities to: security@Apollon - ZK Oracle.com

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- **Documentation**: [Full documentation](./docs/)
- **Issues**: [GitHub Issues](https://github.com/oguzhaangumuss/algo-price-predict/issues)
- **Discussions**: [GitHub Discussions](https://github.com/oguzhaangumuss/algo-price-predict/discussions)

## Acknowledgments

- **Circom & snarkjs**: Zero-knowledge proof infrastructure
- **FastAPI**: High-performance API framework
- **Algorand**: Blockchain platform
- **Open Source Community**: For tools and libraries that made this possible

---

**Built with privacy-first principles using Zero-Knowledge cryptography for the Algorand ecosystem**
