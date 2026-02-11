# Apollon Oracle TypeScript SDK

TypeScript/JavaScript SDK for the Apollon Multichain Price Oracle on NEAR Protocol with Zero-Knowledge proof verification and cross-chain capabilities via NEAR Intents.

## Installation

```bash
npm install @apollon/oracle-sdk
```

## Quick Start

### NEAR Contract Client (Recommended)

```typescript
import { NearOracleClient } from "@apollon/oracle-sdk";

const client = new NearOracleClient({
  networkId: "testnet",
  publisherContract: "apollon-publisher.testnet",
  verifierContract: "apollon-verifier.testnet",
  apiUrl: "http://localhost:8000",
});

await client.initialize();
await client.signIn();

// Request a prediction on NEAR
const requestId = await client.requestPrediction(
  { asset: "NEAR", timeframe: "24h", zkRequired: true },
  "0.1" // deposit in NEAR
);

// Check result
const result = await client.getRequest(requestId);
console.log(`Status: ${result?.status}, Price: ${result?.predictedPrice}`);
```

### Legacy API Client

```typescript
import { AlgoZKOracleClient } from "@apollon/oracle-sdk";

const client = new AlgoZKOracleClient({
  baseURL: "http://localhost:8000",
  enableZKVerification: true,
});

const prediction = await client.predictWithZK({
  symbol: "NEARUSD",
  timeframe: "24h",
});

console.log(prediction.predicted_price);
```

## Features

- **NEAR Contract Integration**: Direct interaction with publisher/verifier contracts
- **Cross-Chain Swaps**: Token swaps across 14+ chains via NEAR Intents
- **Intent Payments**: Pay for predictions from any chain
- **Zero-Knowledge Privacy**: Model weights and individual predictions remain hidden
- **Type Safety**: Full TypeScript support with comprehensive type definitions
- **ZK Proof Verification**: Client-side verification using snarkjs
- **Agent Monitoring**: Query Shade Agent status and TEE attestation
- **Error Handling**: Comprehensive error classification and retry logic

## API Reference

### NearOracleClient

Main client class for NEAR Protocol interactions and cross-chain operations.

#### Constructor

```typescript
new NearOracleClient(config: NearOracleConfig)
```

#### Configuration

```typescript
interface NearOracleConfig {
  networkId: "testnet" | "mainnet";
  nodeUrl?: string;
  walletUrl?: string;
  helperUrl?: string;
  explorerUrl?: string;
  publisherContract: string;
  verifierContract?: string;
  apiUrl?: string; // Backend API URL (default: http://localhost:8000)
}
```

#### NEAR Contract Methods

```typescript
// Initialize and authenticate
await client.initialize();
await client.signIn();
client.signOut();
client.isSignedIn(): boolean;
client.getAccountId(): string | null;

// Prediction requests
await client.requestPrediction(request, deposit): Promise<number>;
await client.getRequest(requestId): Promise<PredictionResponse | null>;
await client.getPendingRequests(limit?): Promise<PredictionResponse[]>;
await client.cancelRequest(requestId): Promise<void>;
await client.fulfillPrediction(requestId, price, zkProof?): Promise<void>;
```

#### Cross-Chain Swap Methods

```typescript
// Token discovery
await client.getSwapTokens(chain?): Promise<Token[]>;
await client.getSwapChains(): Promise<Chain[]>;

// Swap execution
await client.getSwapQuote(params): Promise<QuoteResponse>;
await client.executeSwap(params): Promise<{ depositAddress, quote }>;
await client.getSwapStatus(depositAddress): Promise<{ status, ... }>;
```

#### Intent Payment Methods

```typescript
// Pay for predictions from any chain
await client.getPredictionPaymentQuote(params): Promise<QuoteResponse>;
await client.executePredictionPayment(params): Promise<{ depositAddress, quote }>;
```

#### Agent Methods

```typescript
// Shade Agent status
await client.getAgentStatus(): Promise<AgentStatus>;
```

### AlgoZKOracleClient (Legacy API Client)

HTTP client for direct API interaction.

#### Methods

```typescript
// Health and status
await client.health(): Promise<HealthResponse>;
await client.getModelStatus(): Promise<ModelStatusResponse>;
await client.waitForModels(maxWaitTime?): Promise<boolean>;

// Price data
await client.getCurrentPrice(): Promise<CurrentPriceResponse>;
await client.getTechnicalIndicators(): Promise<TechnicalIndicatorsResponse>;
await client.getHistoricalData(days?): Promise<HistoricalDataResponse>;

// Predictions
await client.predict(request?): Promise<PredictionResponse>;
await client.predictWithZK(request?): Promise<ZKPredictionResponse>;
await client.verifyZKProof(proof, publicSignals): Promise<boolean>;
```

## Error Handling

```typescript
import {
  AlgoZKOracleError,
  NetworkError,
  ValidationError,
  ZKVerificationError,
  ModelNotReadyError,
  RateLimitError,
} from "@apollon/oracle-sdk";

try {
  const prediction = await client.predictWithZK();
} catch (error) {
  if (error instanceof ModelNotReadyError) {
    console.log("Models are still training, waiting...");
    await client.waitForModels();
  } else if (error instanceof NetworkError) {
    console.log("Network error, retrying...");
  }
}
```

## Examples

### Cross-Chain Swap

```typescript
import { NearOracleClient } from "@apollon/oracle-sdk";

const client = new NearOracleClient({
  networkId: "testnet",
  publisherContract: "apollon-publisher.testnet",
  apiUrl: "http://localhost:8000",
});

await client.initialize();

// Get available chains and tokens
const chains = await client.getSwapChains();
console.log("Supported chains:", chains.map((c) => c.name));

const nearTokens = await client.getSwapTokens("near");
console.log("NEAR tokens:", nearTokens.map((t) => t.symbol));

// Get a swap quote (NEAR -> Solana)
const quote = await client.getSwapQuote({
  originAsset: "nep141:wrap.near",
  destinationAsset: "solana:native",
  amount: "1000000000000000000000000", // 1 NEAR in yocto
  recipient: "YourSolanaAddress",
});

console.log("You receive:", quote.quote?.amountOutFormatted);

// Execute the swap
const swap = await client.executeSwap({
  originAsset: "nep141:wrap.near",
  destinationAsset: "solana:native",
  amount: "1000000000000000000000000",
  recipient: "YourSolanaAddress",
});

console.log("Deposit to:", swap.depositAddress);

// Poll for completion
let status;
do {
  await new Promise((r) => setTimeout(r, 5000));
  status = await client.getSwapStatus(swap.depositAddress);
  console.log("Status:", status.status);
} while (status.status !== "SUCCESS" && status.status !== "FAILED");
```

### Intent-Based Prediction Payment

```typescript
// Pay for a prediction from any chain
const payment = await client.executePredictionPayment({
  originAsset: "nep141:usdt.tether-token.near",
  amount: "1000000", // 1 USDT
  refundTo: "your-account.near",
});

console.log("Send payment to:", payment.depositAddress);
```

### Oracle Agent Monitoring

```typescript
const agentStatus = await client.getAgentStatus();
console.log({
  running: agentStatus.status === "running",
  fulfilled: agentStatus.total_fulfilled,
  tee: agentStatus.tee_attestation ? "Attested" : "Development",
  chains: agentStatus.chains,
});
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
