/**
 * Apollon Oracle SDK
 *
 * A TypeScript SDK for interacting with the Apollon Oracle on NEAR Protocol,
 * featuring zero-knowledge proof verification for privacy-enhanced
 * machine learning predictions.
 */
export { NearOracleClient } from './near/client';
export type { NearOracleConfig, PredictionRequest, PredictionResponse } from './near/client';
export { AlgoZKOracleClient } from './client/oracle-client';
export * from './types';
export { ZKVerifier } from './utils/zk-verifier';
export { AlgoZKOracleError, NetworkError, ValidationError, ZKVerificationError, ModelNotReadyError, RateLimitError, isRetryableError, } from './utils/errors';
export { withRetry, exponentialBackoff } from './utils/retry';
export { NearOracleClient as default } from './near/client';
//# sourceMappingURL=index.d.ts.map