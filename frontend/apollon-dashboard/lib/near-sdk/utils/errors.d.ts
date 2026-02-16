/**
 * Error handling utilities for Apollon - ZK Oracle Oracle SDK
 */
import { SDKError } from '../types';
export declare class AlgoZKOracleError extends Error {
    readonly code: string;
    readonly details?: any;
    readonly timestamp: string;
    constructor(code: string, message: string, details?: any);
    toJSON(): SDKError;
}
export declare class NetworkError extends AlgoZKOracleError {
    constructor(message: string, details?: any);
}
export declare class ValidationError extends AlgoZKOracleError {
    constructor(message: string, details?: any);
}
export declare class ZKVerificationError extends AlgoZKOracleError {
    constructor(message: string, details?: any);
}
export declare class ModelNotReadyError extends AlgoZKOracleError {
    constructor(message?: string);
}
export declare class RateLimitError extends AlgoZKOracleError {
    constructor(message?: string);
}
export declare function isRetryableError(error: Error): boolean;
//# sourceMappingURL=errors.d.ts.map