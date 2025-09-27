/**
 * Retry utilities for ALGO ZK Oracle SDK
 */

import { isRetryableError } from './errors';

export interface RetryOptions {
  maxAttempts: number;
  delay: number;
  backoffFactor: number;
  maxDelay: number;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  delay: 1000, // 1 second
  backoffFactor: 2,
  maxDelay: 10000, // 10 seconds
};

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error;

  for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === opts.maxAttempts || !isRetryableError(lastError)) {
        throw lastError;
      }

      const delay = Math.min(
        opts.delay * Math.pow(opts.backoffFactor, attempt - 1),
        opts.maxDelay
      );

      await sleep(delay);
    }
  }

  throw lastError!;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function exponentialBackoff(attempt: number, baseDelay: number = 1000): number {
  return Math.min(baseDelay * Math.pow(2, attempt), 30000);
}