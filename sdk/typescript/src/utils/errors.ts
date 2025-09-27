/**
 * Error handling utilities for Apollon - ZK Oracle Oracle SDK
 */

import { SDKError } from '../types';

export class AlgoZKOracleError extends Error {
  public readonly code: string;
  public readonly details?: any;
  public readonly timestamp: string;

  constructor(code: string, message: string, details?: any) {
    super(message);
    this.name = 'AlgoZKOracleError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }

  toJSON(): SDKError {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: this.timestamp,
    };
  }
}

export class NetworkError extends AlgoZKOracleError {
  constructor(message: string, details?: any) {
    super('NETWORK_ERROR', message, details);
  }
}

export class ValidationError extends AlgoZKOracleError {
  constructor(message: string, details?: any) {
    super('VALIDATION_ERROR', message, details);
  }
}

export class ZKVerificationError extends AlgoZKOracleError {
  constructor(message: string, details?: any) {
    super('ZK_VERIFICATION_ERROR', message, details);
  }
}

export class ModelNotReadyError extends AlgoZKOracleError {
  constructor(message: string = 'ML models are still training') {
    super('MODEL_NOT_READY', message);
  }
}

export class RateLimitError extends AlgoZKOracleError {
  constructor(message: string = 'Rate limit exceeded') {
    super('RATE_LIMIT_ERROR', message);
  }
}

export function isRetryableError(error: Error): boolean {
  if (error instanceof AlgoZKOracleError) {
    return ['NETWORK_ERROR', 'MODEL_NOT_READY'].includes(error.code);
  }
  
  // Handle axios errors
  if ('response' in error && error.response) {
    const status = (error.response as any).status;
    return status >= 500 || status === 503 || status === 429;
  }

  return false;
}