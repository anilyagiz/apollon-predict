"use strict";
/**
 * Error handling utilities for Apollon - ZK Oracle Oracle SDK
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimitError = exports.ModelNotReadyError = exports.ZKVerificationError = exports.ValidationError = exports.NetworkError = exports.AlgoZKOracleError = void 0;
exports.isRetryableError = isRetryableError;
class AlgoZKOracleError extends Error {
    constructor(code, message, details) {
        super(message);
        this.name = 'AlgoZKOracleError';
        this.code = code;
        this.details = details;
        this.timestamp = new Date().toISOString();
    }
    toJSON() {
        return {
            code: this.code,
            message: this.message,
            details: this.details,
            timestamp: this.timestamp,
        };
    }
}
exports.AlgoZKOracleError = AlgoZKOracleError;
class NetworkError extends AlgoZKOracleError {
    constructor(message, details) {
        super('NETWORK_ERROR', message, details);
    }
}
exports.NetworkError = NetworkError;
class ValidationError extends AlgoZKOracleError {
    constructor(message, details) {
        super('VALIDATION_ERROR', message, details);
    }
}
exports.ValidationError = ValidationError;
class ZKVerificationError extends AlgoZKOracleError {
    constructor(message, details) {
        super('ZK_VERIFICATION_ERROR', message, details);
    }
}
exports.ZKVerificationError = ZKVerificationError;
class ModelNotReadyError extends AlgoZKOracleError {
    constructor(message = 'ML models are still training') {
        super('MODEL_NOT_READY', message);
    }
}
exports.ModelNotReadyError = ModelNotReadyError;
class RateLimitError extends AlgoZKOracleError {
    constructor(message = 'Rate limit exceeded') {
        super('RATE_LIMIT_ERROR', message);
    }
}
exports.RateLimitError = RateLimitError;
function isRetryableError(error) {
    if (error instanceof AlgoZKOracleError) {
        return ['NETWORK_ERROR', 'MODEL_NOT_READY'].includes(error.code);
    }
    // Handle axios errors
    if ('response' in error && error.response) {
        const status = error.response.status;
        return status >= 500 || status === 503 || status === 429;
    }
    return false;
}
//# sourceMappingURL=errors.js.map