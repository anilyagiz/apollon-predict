"use strict";
/**
 * Retry utilities for Apollon - ZK Oracle Oracle SDK
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.withRetry = withRetry;
exports.exponentialBackoff = exponentialBackoff;
const errors_1 = require("./errors");
const DEFAULT_RETRY_OPTIONS = {
    maxAttempts: 3,
    delay: 1000, // 1 second
    backoffFactor: 2,
    maxDelay: 10000, // 10 seconds
};
async function withRetry(fn, options = {}) {
    const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
    let lastError;
    for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
        try {
            return await fn();
        }
        catch (error) {
            lastError = error;
            if (attempt === opts.maxAttempts || !(0, errors_1.isRetryableError)(lastError)) {
                throw lastError;
            }
            const delay = Math.min(opts.delay * Math.pow(opts.backoffFactor, attempt - 1), opts.maxDelay);
            await sleep(delay);
        }
    }
    throw lastError;
}
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
function exponentialBackoff(attempt, baseDelay = 1000) {
    return Math.min(baseDelay * Math.pow(2, attempt), 30000);
}
//# sourceMappingURL=retry.js.map