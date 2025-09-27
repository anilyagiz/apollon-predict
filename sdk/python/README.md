# Apollon - ZK Oracle Oracle Python SDK

Python SDK for the Apollon - ZK Oracle Price Oracle system with Zero-Knowledge proof verification.

## Installation

```bash
pip install algo-zk-oracle-sdk
```

## Quick Start

### Async Usage (Recommended)

```python
import asyncio
from algo_zk_oracle import AlgoZKOracleClient, SDKConfig

async def main():
    config = SDKConfig(
        base_url="http://localhost:8000",
        timeout=30.0,
        retries=3,
        enable_zk_verification=True,
    )

    async with AlgoZKOracleClient(config) as client:
        # Generate ZK-enhanced prediction
        prediction = await client.predict_with_zk()

        print(f"Predicted price: ${prediction.predicted_price:.6f}")
        print(f"Confidence: {prediction.confidence:.2%}")
        print(f"Model weights hidden: {prediction.privacy_status.model_weights_hidden}")
        print(f"ZK proof verified: {prediction.zk_proof.verified}")

asyncio.run(main())
```

### Synchronous Usage

```python
from algo_zk_oracle.client.oracle_client import AlgoZKOracleClientSync
from algo_zk_oracle import SDKConfig

config = SDKConfig(base_url="http://localhost:8000")
client = AlgoZKOracleClientSync(config)

try:
    # Check health
    health = client.health()
    print(f"API Status: {health.status}")

    # Generate prediction
    prediction = client.predict()
    print(f"Predicted price: ${prediction.predicted_price:.6f}")

finally:
    client.close()
```

## Features

- **Zero-Knowledge Privacy**: Model weights and individual predictions remain hidden
- **Type Safety**: Full Pydantic model support with type validation
- **Async/Sync Support**: Both asynchronous and synchronous client interfaces
- **Error Handling**: Comprehensive error classification and retry logic
- **Python 3.8+**: Compatible with modern Python versions

## API Reference

### AlgoZKOracleClient (Async)

Main async client class for interacting with the Apollon - ZK Oracle Oracle API.

#### Usage as Context Manager

```python
async with AlgoZKOracleClient(config) as client:
    result = await client.predict()
```

#### Configuration

```python
from algo_zk_oracle import SDKConfig

config = SDKConfig(
    base_url="http://localhost:8000",      # API base URL
    timeout=30.0,                          # Request timeout in seconds
    retries=3,                             # Number of retry attempts
    retry_delay=1.0,                       # Delay between retries
    enable_zk_verification=True,           # Enable ZK verification
)
```

#### Methods

##### Health and Status

```python
# Check API health
health = await client.health()

# Get model training status
status = await client.get_model_status()

# Wait for models to be ready
ready = await client.wait_for_models(max_wait_time=300.0)
```

##### Price Data

```python
# Get current aggregated price
price = await client.get_current_price()

# Get technical indicators
technicals = await client.get_technical_indicators()

# Get historical data
historical = await client.get_historical_data(days=30)
```

##### Predictions

```python
from algo_zk_oracle import PredictionRequest

# Generate standard prediction
prediction = await client.predict(PredictionRequest(
    symbol="ALGOUSD",
    timeframe="24h",
    include_confidence=True,
))

# Generate ZK-enhanced prediction
zk_prediction = await client.predict_with_zk()

# Verify ZK proof independently
verified = await client.verify_zk_proof(proof, public_signals)
```

### AlgoZKOracleClientSync (Sync)

Synchronous wrapper providing the same interface without async/await.

```python
from algo_zk_oracle.client.oracle_client import AlgoZKOracleClientSync

client = AlgoZKOracleClientSync(config)

# All methods are synchronous
health = client.health()
prediction = client.predict()
zk_prediction = client.predict_with_zk()

# Remember to close
client.close()
```

## Error Handling

The SDK provides comprehensive error handling with specific exception types:

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
except ValidationError as e:
    print(f"Validation error: {e.message}")
except AlgoZKOracleError as e:
    print(f"SDK error [{e.code}]: {e.message}")
```

## Data Models

All responses use Pydantic models for type safety:

```python
from algo_zk_oracle import (
    PredictionResponse,
    ZKPredictionResponse,
    CurrentPriceResponse,
    TechnicalIndicatorsResponse,
    HealthResponse,
)

# Type hints work automatically
prediction: PredictionResponse = await client.predict()
print(f"Price: {prediction.predicted_price}")
print(f"Confidence: {prediction.confidence}")

# Access nested models
print(f"LSTM prediction: {prediction.individual_predictions.lstm}")
print(f"Model weights: {prediction.model_weights}")
```

## Examples

### Basic Price Monitoring

```python
import asyncio
from algo_zk_oracle import AlgoZKOracleClient, SDKConfig

async def monitor_price():
    config = SDKConfig(base_url="http://localhost:8000")

    async with AlgoZKOracleClient(config) as client:
        # Wait for models
        await client.wait_for_models()

        while True:
            try:
                # Get current price
                current = await client.get_current_price()
                print(f"Current: ${current.price:.6f} ({current.confidence:.1%})")

                # Get prediction
                prediction = await client.predict()
                change = prediction.price_change_percent
                direction = "↑" if change > 0 else "↓"

                print(f"24h Prediction: ${prediction.predicted_price:.6f} {direction}{abs(change):.2f}%")
                print(f"Confidence: {prediction.confidence:.1%}")
                print("-" * 50)

                await asyncio.sleep(60)  # Check every minute

            except Exception as e:
                print(f"Error: {e}")
                await asyncio.sleep(10)

asyncio.run(monitor_price())
```

### ZK Privacy Analysis

```python
async def analyze_zk_privacy():
    config = SDKConfig(base_url="http://localhost:8000")

    async with AlgoZKOracleClient(config) as client:
        # Generate both standard and ZK predictions
        standard = await client.predict()
        zk_enhanced = await client.predict_with_zk()

        print("Standard Prediction:")
        print(f"  Predicted Price: ${standard.predicted_price:.6f}")
        print(f"  Model Weights Visible: {standard.model_weights}")
        print(f"  Individual Predictions: {standard.individual_predictions}")

        print("\\nZK-Enhanced Prediction:")
        print(f"  Predicted Price: ${zk_enhanced.predicted_price:.6f}")
        print(f"  Model Weights Hidden: {zk_enhanced.privacy_status.model_weights_hidden}")
        print(f"  Individual Predictions Hidden: {zk_enhanced.privacy_status.individual_predictions_hidden}")
        print(f"  ZK Proof Verified: {zk_enhanced.zk_proof.verified}")
        print(f"  Circuit Hash: {zk_enhanced.privacy_status.circuit_hash}")
```

### Error Handling with Retries

```python
from algo_zk_oracle.utils.retry import retry_async_func, RetryConfig

async def robust_prediction():
    config = SDKConfig(base_url="http://localhost:8000")

    # Custom retry configuration
    retry_config = RetryConfig(
        max_attempts=5,
        delay=2.0,
        backoff_factor=2.0,
        max_delay=30.0,
    )

    async with AlgoZKOracleClient(config) as client:
        # Use manual retry for specific operations
        prediction = await retry_async_func(
            client.predict_with_zk,
            retry_config
        )

        print(f"Prediction successful: ${prediction.predicted_price:.6f}")
```

### Batch Data Analysis

```python
async def batch_analysis():
    config = SDKConfig(base_url="http://localhost:8000")

    async with AlgoZKOracleClient(config) as client:
        # Gather multiple data points
        health, current_price, technicals, historical = await asyncio.gather(
            client.health(),
            client.get_current_price(),
            client.get_technical_indicators(),
            client.get_historical_data(days=7),
        )

        print(f"System Health: {health.status}")
        print(f"Current Price: ${current_price.price:.6f}")
        print(f"RSI: {technicals.indicators.rsi:.2f}")
        print(f"7-day data points: {len(historical.data)}")

        # Generate prediction with all context
        prediction = await client.predict_with_zk()
        print(f"ZK Prediction: ${prediction.predicted_price:.6f}")
```

## Development

### Setup Development Environment

```bash
git clone https://github.com/oguzhaangumuss/algo-price-predict
cd algo-price-predict/sdk/python

# Install in development mode
pip install -e .[dev]
```

### Running Tests

```bash
pytest
```

### Code Formatting

```bash
black algo_zk_oracle/
isort algo_zk_oracle/
```

### Type Checking

```bash
mypy algo_zk_oracle/
```

## License

MIT License
