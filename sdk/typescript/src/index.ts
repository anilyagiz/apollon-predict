/**
 * Apollon Oracle SDK
 * 
 * A TypeScript SDK for interacting with the Apollon Oracle on NEAR Protocol,
 * featuring zero-knowledge proof verification for privacy-enhanced 
 * machine learning predictions.
 */

// NEAR Protocol Client (New)
export { NearOracleClient } from './near/client';
export type { NearOracleConfig, PredictionRequest, PredictionResponse } from './near/client';

// Legacy Algorand Client (Deprecated)
export { AlgoZKOracleClient } from './client/oracle-client';

// Types
export * from './types';

// Utilities
export { ZKVerifier } from './utils/zk-verifier';
export {
  AlgoZKOracleError,
  NetworkError,
  ValidationError,
  ZKVerificationError,
  ModelNotReadyError,
  RateLimitError,
  isRetryableError,
} from './utils/errors';
export { withRetry, exponentialBackoff } from './utils/retry';

// Default export - Now uses NEAR
export { NearOracleClient as default } from './near/client';