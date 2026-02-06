# Apollon Oracle - Complete Setup Guide

## 🚀 Quick Start

### Prerequisites

- **Node.js** 20+ 
- **Python** 3.11+
- **Rust** 1.70+ (for NEAR contracts)
- **Docker** & Docker Compose (optional)
- **Git**

### 1. Clone Repository

```bash
git clone https://github.com/oguzhaangumuss/algo-price-predict
cd near-apollon
```

### 2. Environment Setup

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
# Required: CMC_API_KEY (optional but recommended)
# Required: NEAR_TESTNET_ACCOUNT (for contract deployment)
```

### 3. Backend Setup

```bash
# Install Python dependencies
cd backend/api
pip install -r requirements.txt

# Setup ZK Proof System
cd ../zk-privacy
npm install
node setup.js

# Return to API directory
cd ../api

# Start the server
python server.py
```

The API will be available at `http://localhost:8000`

### 4. Frontend Setup

```bash
cd frontend/algo-zk-dashboard

# Install dependencies
npm install

# Start development server
npm run dev
```

The dashboard will be available at `http://localhost:3000`

### 5. NEAR Contract Deployment (Optional)

```bash
cd contracts/publisher

# Build the contract
cargo build --target wasm32-unknown-unknown --release

# Deploy to NEAR testnet
near deploy --accountId YOUR_ACCOUNT.testnet \
  --wasmFile target/wasm32-unknown-unknown/release/publisher.wasm

# Initialize the contract
near call YOUR_ACCOUNT.testnet new '{"verifier_contract": null}' \
  --accountId YOUR_ACCOUNT.testnet
```

## 🐳 Docker Setup

### Using Docker Compose (Recommended)

```bash
# Start all services
docker-compose up -d

# Services will be available at:
# - API: http://localhost:8000
# - Frontend: http://localhost:3000
# - Redis: localhost:6379
```

### Individual Docker Builds

```bash
# Build API
docker build -t apollon-api ./backend/api

# Build Frontend
docker build -t apollon-frontend ./frontend/algo-zk-dashboard

# Build ZK Service
docker build -t apollon-zk ./backend/zk-privacy
```

## 📋 Feature Status

### ✅ Completed Features

1. **Backend API**
   - FastAPI server with CORS
   - Health check endpoint
   - Price aggregation from multiple sources
   - ML ensemble prediction (LSTM, GRU, Prophet, XGBoost)
   - ZK proof integration
   - Technical indicators calculation

2. **Frontend Dashboard**
   - Next.js 15 with TypeScript
   - Real-time price charts
   - ML prediction visualization
   - ZK proof status display
   - Responsive design

3. **Smart Contracts**
   - NEAR Protocol publisher contract
   - Verifier contract (proof parsing)
   - Request/fufill/cancel flow
   - ZK verification integration

4. **ZK Privacy**
   - Circom circuit for prediction verification
   - SnarkJS integration
   - Proof generation and verification
   - Development setup script

5. **TypeScript SDK**
   - NEAR Protocol client
   - ZK verifier utilities
   - Error handling and retry logic
   - Type definitions

6. **DevOps**
   - Docker configuration
   - CI/CD pipeline (GitHub Actions)
   - Test suite structure
   - Environment configuration

### 🚧 Known Limitations

1. **ZK Proofs**: Currently using development setup. Production requires trusted setup ceremony.
2. **ML Models**: Models train on startup, which may take several minutes.
3. **Data Sources**: Free APIs have rate limits. Consider upgrading for production.
4. **Test Coverage**: Basic test structure in place, needs expansion.

## 🔧 Configuration

### API Configuration

Edit `backend/api/.env`:

```env
# API Keys (Optional but recommended)
CMC_API_KEY=your_coinmarketcap_api_key
COINGECKO_API_KEY=your_coingecko_api_key

# NEAR Configuration
NEAR_NETWORK=testnet
NEAR_NODE_URL=https://rpc.testnet.near.org

# Redis (if not using Docker)
REDIS_URL=redis://localhost:6379

# ML Configuration
MODEL_RETRAIN_INTERVAL_HOURS=24
PREDICTION_CACHE_MINUTES=5
```

### Frontend Configuration

Edit `frontend/algo-zk-dashboard/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_NEAR_NETWORK=testnet
NEXT_PUBLIC_NEAR_CONTRACT_ID=your-contract.testnet
```

## 🧪 Testing

### Run API Tests

```bash
cd backend/api
pytest tests/ -v
```

### Run Contract Tests

```bash
cd contracts/verifier
cargo test
```

### Run Frontend Tests

```bash
cd frontend/algo-zk-dashboard
npm test
```

## 📊 API Endpoints

### Health & Status
- `GET /health` - Health check
- `GET /models/status` - Model training status

### Price Data
- `GET /price/current` - Current aggregated price
- `GET /price/technicals` - Technical indicators
- `GET /price/historical?days=30` - Historical data

### Predictions
- `POST /predict` - Generate prediction
- `POST /predict-zk` - Generate prediction with ZK proof
- `POST /verify-zk` - Verify ZK proof

### Admin
- `POST /models/retrain` - Retrain models

## 🛠️ Troubleshooting

### Common Issues

1. **Import Errors**
   - Ensure all Python dependencies are installed
   - Check PYTHONPATH includes ml-engine and data-aggregator

2. **ZK Proof Failures**
   - Run `node setup.js` in zk-privacy directory
   - Check build files exist

3. **Model Training Failures**
   - Ensure sufficient historical data
   - Check ML library installations

4. **NEAR Connection Issues**
   - Verify NEAR CLI is configured
   - Check account has sufficient balance

### Debug Mode

```bash
# Enable debug logging
export LOG_LEVEL=DEBUG

# Run with reload
python server.py --reload
```

## 📝 Next Steps

1. **Production Deployment**
   - Set up production NEAR account
   - Run trusted setup ceremony for ZK
   - Configure monitoring and alerting

2. **Enhancements**
   - Add more ML models
   - Implement caching layer
   - Add WebSocket support for real-time updates

3. **Security**
   - Implement rate limiting
   - Add API key authentication
   - Audit smart contracts

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open Pull Request

## 📄 License

MIT License - see LICENSE file

## 🆘 Support

- **Issues**: GitHub Issues
- **Documentation**: See README.md in each component
- **Email**: support@apollon-oracle.com

---

**Status**: Phase 1 Complete - Working price prediction oracle with ML ensemble models and ZK privacy
