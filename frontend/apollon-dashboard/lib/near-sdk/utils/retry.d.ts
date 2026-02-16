/**
 * Retry utilities for Apollon - ZK Oracle Oracle SDK
 */
export interface RetryOptions {
    maxAttempts: number;
    delay: number;
    backoffFactor: number;
    maxDelay: number;
}
export declare function withRetry<T>(fn: () => Promise<T>, options?: Partial<RetryOptions>): Promise<T>;
export declare function exponentialBackoff(attempt: number, baseDelay?: number): number;
//# sourceMappingURL=retry.d.ts.map