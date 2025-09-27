# ALGO ZK Price Prediction Oracle

A privacy-enhanced price prediction oracle for Algorand blockchain using Zero-Knowledge proofs and ensemble machine learning models.

## 🎯 Project Overview

This project implements a sophisticated price prediction oracle that combines:
- **Ensemble ML Models**: LSTM, GRU, Prophet, and XGBoost for robust predictions
- **Multi-Source Data**: CoinGecko, CoinMarketCap, and on-chain data aggregation
- **Zero-Knowledge Privacy**: Future implementation with snarkjs and TEE
- **Algorand Integration**: Native smart contract oracle with TEAL

## 🏗️ Architecture

```
ALGO-ZK-ORACLE/
├── backend/
│   ├── oracle-core/          # Algorand oracle (from randlabs)
│   ├── ml-engine/           # ML prediction models (from CryptoPredictions)
│   ├── data-aggregator/     # Multi-source price data collection
│   ├── zk-privacy/          # Zero-Knowledge implementation
│   └── api/                 # REST API server
├── frontend/
│   ├── dashboard/           # Next.js prediction dashboard
│   └── components/          # Reusable UI components
├── smart-contracts/
│   ├── algorand/            # TEAL oracle contracts
│   └── zk-circuits/         # Circom ZK circuits
└── tests/
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Python 3.8+
- Redis (optional, for caching)

### Installation

1. **Clone and setup:**
```bash
cd ALGO
cp .env.example .env
# Edit .env with your API keys
```

2. **Install backend dependencies:**
```bash
# Oracle core (Node.js)
cd backend/oracle-core
npm install

# API server (Node.js)
cd ../api
npm install

# ML engine (Python)
cd ../ml-engine
pip install -r requirements.txt

# Data aggregator (Python)
cd ../data-aggregator
pip install -r requirements.txt
```

3. **Start the API server:**
```bash
cd backend/api
python server.py
```

The API will be available at `http://localhost:8000`

### API Endpoints

- `GET /` - API information
- `GET /health` - Health check
- `POST /predict` - Generate price prediction
- `GET /price/current` - Current aggregated price
- `GET /price/technicals` - Technical indicators
- `GET /price/historical?days=30` - Historical data

### Example Usage

**Get current price:**
```bash
curl http://localhost:8000/price/current
```

**Generate 24h prediction:**
```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"symbol": "ALGOUSD", "timeframe": "24h"}'
```

**Response:**
```json
{
  "symbol": "ALGOUSD",
  "timeframe": "24h",
  "predicted_price": 0.185432,
  "current_price": 0.182156,
  "price_change": 0.003276,
  "price_change_percent": 1.8,
  "confidence": 0.823,
  "confidence_interval": {
    "lower": 0.179045,
    "upper": 0.191819
  },
  "individual_predictions": {
    "lstm": 0.186234,
    "gru": 0.184567,
    "prophet": 0.185123,
    "xgboost": 0.185804
  },
  "model_weights": {
    "lstm": 0.35,
    "gru": 0.25,
    "prophet": 0.25,
    "xgboost": 0.15
  },
  "timestamp": "2024-09-27T19:45:00.000Z"
}
```

## 🤖 ML Models

### Ensemble Components

1. **LSTM (Long Short-Term Memory)**
   - Weight: 35%
   - Best for: Sequential price patterns
   - Features: Price lags, moving averages, RSI

2. **GRU (Gated Recurrent Unit)**
   - Weight: 25%
   - Best for: Faster training, similar to LSTM
   - Features: Price changes, volatility

3. **Prophet (Facebook's time series)**
   - Weight: 25%
   - Best for: Trend and seasonality
   - Features: Time-based patterns

4. **XGBoost (Gradient Boosting)**
   - Weight: 15%
   - Best for: Non-linear relationships
   - Features: Technical indicators

### Model Training

Models are automatically trained on startup using 90 days of historical data. Retraining can be triggered via API:

```bash
curl -X POST http://localhost:8000/models/retrain
```

## 📊 Data Sources

### Free APIs Used

- **CoinGecko**: 30 calls/min free tier
- **CoinMarketCap**: Basic free tier
- **Algorand Node**: Direct blockchain data

### Technical Indicators

- Simple Moving Averages (SMA 5, 10, 20)
- Relative Strength Index (RSI)
- Bollinger Bands
- Price volatility
- Volume indicators

## 🔒 Zero-Knowledge Implementation (Planned)

Future ZK features:
- Model privacy preservation
- Prediction verification without revealing internals
- TEE (Trusted Execution Environment) integration
- Circom circuits for proof generation

## 📈 Performance Metrics

Current ensemble performance targets:
- **Accuracy**: >70% for 24h predictions
- **Response Time**: <500ms
- **Uptime**: >99.5%
- **Confidence Threshold**: >0.6 for production use

## 🛠️ Development

### Running Tests

```bash
# Python tests
cd backend/ml-engine
python -m pytest tests/

# Node.js tests
cd backend/oracle-core
npm test
```

### Code Structure

- **Modular Design**: Each component is independently deployable
- **Copy-Paste Friendly**: Built from proven existing codebases
- **Extensible**: Easy to add new models or data sources

## 📋 Roadmap

See [docs/MDs/ROADMAP.md](docs/MDs/ROADMAP.md) for detailed 8-week implementation plan.

### Phase 1 ✅ (Completed)
- [x] Project structure
- [x] Base oracle code integration
- [x] ML models implementation
- [x] Data aggregation
- [x] REST API

### Phase 2 (Next)
- [ ] Frontend dashboard
- [ ] ZK circuit implementation
- [ ] TEE integration
- [ ] Production deployment

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Add tests
5. Submit pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

- **randlabs/algo-price-oracle**: Oracle foundation
- **CryptoPredictions**: ML models base
- **GoraNetwork**: Oracle consumer patterns
- **Algorand Foundation**: Blockchain infrastructure

---

**Status**: Phase 1 Complete - Working price prediction oracle with ensemble ML models ✅