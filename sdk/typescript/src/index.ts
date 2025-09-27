/**
 * Apollon - ZK Oracle Price Oracle SDK
 * 
 * A TypeScript SDK for interacting with the Apollon - ZK Oracle Price Oracle API,
 * featuring zero-knowledge proof verification for privacy-enhanced 
 * machine learning predictions.
 */

// Main client
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

// Default export for convenience
export { AlgoZKOracleClient as default } from './client/oracle-client';