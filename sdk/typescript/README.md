# ALGO ZK Oracle TypeScript SDK

TypeScript/JavaScript SDK for the ALGO ZK Price Oracle system with Zero-Knowledge proof verification.

## Installation

```bash
npm install @algo-zk/oracle-sdk
```

## Quick Start

```typescript
import { AlgoZKOracleClient } from '@algo-zk/oracle-sdk';

// Initialize client
const client = new AlgoZKOracleClient({
  baseURL: 'http://localhost:8000',
  timeout: 30000,
  retries: 3,
  enableZKVerification: true,
});

// Initialize ZK verification (optional)
await client.initializeZKVerification();

// Generate ZK-enhanced prediction
const prediction = await client.predictWithZK({
  symbol: 'ALGOUSD',
  timeframe: '24h',
});

console.log({
  price: prediction.predicted_price,
  confidence: prediction.confidence,
  weights_hidden: prediction.privacy_status.model_weights_hidden,
  zk_verified: prediction.zk_proof.verified,
});
```

## Features

- **Zero-Knowledge Privacy**: Model weights and individual predictions remain hidden
- **Type Safety**: Full TypeScript support with comprehensive type definitions  
- **ZK Proof Verification**: Client-side verification using snarkjs
- **Error Handling**: Comprehensive error classification and retry logic
- **Performance**: Optimized for browser and Node.js environments

## API Reference

### AlgoZKOracleClient

Main client class for interacting with the ALGO ZK Oracle API.

#### Constructor

```typescript
new AlgoZKOracleClient(config: SDKConfig)
```

#### Configuration

```typescript
interface SDKConfig {
  baseURL: string;                    // API base URL
  timeout?: number;                   // Request timeout (default: 30000ms)
  retries?: number;                   // Retry attempts (default: 3)
  retryDelay?: number;               // Retry delay (default: 1000ms)
  enableZKVerification?: boolean;     // Enable ZK verification (default: true)
}
```

#### Methods

##### Health and Status

```typescript
// Check API health
await client.health(): Promise<HealthResponse>

// Get model training status  
await client.getModelStatus(): Promise<ModelStatusResponse>

// Wait for models to be ready
await client.waitForModels(maxWaitTime?: number): Promise<boolean>
```

##### Price Data

```typescript
// Get current aggregated price
await client.getCurrentPrice(): Promise<CurrentPriceResponse>

// Get technical indicators
await client.getTechnicalIndicators(): Promise<TechnicalIndicatorsResponse>

// Get historical data
await client.getHistoricalData(days?: number): Promise<HistoricalDataResponse>
```

##### Predictions

```typescript
// Generate standard prediction
await client.predict(request?: PredictionRequest): Promise<PredictionResponse>

// Generate ZK-enhanced prediction
await client.predictWithZK(request?: PredictionRequest): Promise<ZKPredictionResponse>

// Verify ZK proof independently
await client.verifyZKProof(proof: any, publicSignals: string[]): Promise<boolean>
```

## Error Handling

The SDK provides comprehensive error handling with specific error types:

```typescript
import { 
  AlgoZKOracleError,
  NetworkError,
  ValidationError,
  ZKVerificationError,
  ModelNotReadyError,
  RateLimitError 
} from '@algo-zk/oracle-sdk';

try {
  const prediction = await client.predictWithZK();
} catch (error) {
  if (error instanceof ModelNotReadyError) {
    console.log('Models are still training, waiting...');
    await client.waitForModels();
  } else if (error instanceof NetworkError) {
    console.log('Network error, retrying...');
  } else {
    console.error('Unexpected error:', error.message);
  }
}
```

## ZK Proof Verification

The SDK includes built-in ZK proof verification capabilities:

```typescript
import { ZKVerifier } from '@algo-zk/oracle-sdk';

const verifier = new ZKVerifier();

// Load verification key
await verifier.loadVerificationKey('http://localhost:8000/verification_key.json');

// Verify proof
const verified = await verifier.verifyProof(zkProof);

// Verify prediction consistency
const consistent = verifier.verifyPredictionConsistency(
  predictedPrice,
  publicSignals
);

// Complete verification
const result = await verifier.verifyComplete(zkProof, predictedPrice);
console.log({
  proofValid: result.proofValid,
  dataConsistent: result.dataConsistent,
  overallValid: result.overallValid,
});
```

## Examples

### Basic Usage

```typescript
import { AlgoZKOracleClient } from '@algo-zk/oracle-sdk';

const client = new AlgoZKOracleClient({
  baseURL: 'http://localhost:8000',
});

// Check if models are ready
const health = await client.health();
if (!health.models_trained) {
  await client.waitForModels(60000); // Wait up to 1 minute
}

// Get current price
const price = await client.getCurrentPrice();
console.log(`Current ALGO price: $${price.price}`);

// Generate prediction
const prediction = await client.predict({
  symbol: 'ALGOUSD',
  timeframe: '24h',
});

console.log(`Predicted price: $${prediction.predicted_price}`);
console.log(`Confidence: ${(prediction.confidence * 100).toFixed(1)}%`);
```

### Advanced ZK Usage

```typescript
// Generate ZK-enhanced prediction with full verification
const zkPrediction = await client.predictWithZK();

console.log('Privacy Status:', {
  model_weights_hidden: zkPrediction.privacy_status.model_weights_hidden,
  predictions_hidden: zkPrediction.privacy_status.individual_predictions_hidden,
  circuit_verified: zkPrediction.privacy_status.circuit_verified,
});

// Verify the proof independently
const verified = await client.verifyZKProof(
  zkPrediction.zk_proof.proof,
  zkPrediction.zk_proof.public_signals
);

console.log(`ZK Proof verified: ${verified}`);
```

### Error Handling with Retries

```typescript
import { withRetry, isRetryableError } from '@algo-zk/oracle-sdk';

try {
  const prediction = await withRetry(
    () => client.predictWithZK(),
    { maxAttempts: 5, delay: 2000 }
  );
  
  console.log('Prediction successful:', prediction.predicted_price);
} catch (error) {
  if (isRetryableError(error)) {
    console.log('Retryable error occurred, but max attempts reached');
  } else {
    console.log('Non-retryable error:', error.message);
  }
}
```

## Development

### Building

```bash
npm install
npm run build
```

### Testing

```bash
npm test
```

### Linting

```bash
npm run lint
```

## License

MIT License