"use strict";
/**
 * Apollon Oracle SDK
 *
 * A TypeScript SDK for interacting with the Apollon Oracle on NEAR Protocol,
 * featuring zero-knowledge proof verification for privacy-enhanced
 * machine learning predictions.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = exports.exponentialBackoff = exports.withRetry = exports.isRetryableError = exports.RateLimitError = exports.ModelNotReadyError = exports.ZKVerificationError = exports.ValidationError = exports.NetworkError = exports.AlgoZKOracleError = exports.ZKVerifier = exports.AlgoZKOracleClient = exports.NearOracleClient = void 0;
// NEAR Protocol Client (New)
var client_1 = require("./near/client");
Object.defineProperty(exports, "NearOracleClient", { enumerable: true, get: function () { return client_1.NearOracleClient; } });
// Legacy Algorand Client (Deprecated)
var oracle_client_1 = require("./client/oracle-client");
Object.defineProperty(exports, "AlgoZKOracleClient", { enumerable: true, get: function () { return oracle_client_1.AlgoZKOracleClient; } });
// Types
__exportStar(require("./types"), exports);
// Utilities
var zk_verifier_1 = require("./utils/zk-verifier");
Object.defineProperty(exports, "ZKVerifier", { enumerable: true, get: function () { return zk_verifier_1.ZKVerifier; } });
var errors_1 = require("./utils/errors");
Object.defineProperty(exports, "AlgoZKOracleError", { enumerable: true, get: function () { return errors_1.AlgoZKOracleError; } });
Object.defineProperty(exports, "NetworkError", { enumerable: true, get: function () { return errors_1.NetworkError; } });
Object.defineProperty(exports, "ValidationError", { enumerable: true, get: function () { return errors_1.ValidationError; } });
Object.defineProperty(exports, "ZKVerificationError", { enumerable: true, get: function () { return errors_1.ZKVerificationError; } });
Object.defineProperty(exports, "ModelNotReadyError", { enumerable: true, get: function () { return errors_1.ModelNotReadyError; } });
Object.defineProperty(exports, "RateLimitError", { enumerable: true, get: function () { return errors_1.RateLimitError; } });
Object.defineProperty(exports, "isRetryableError", { enumerable: true, get: function () { return errors_1.isRetryableError; } });
var retry_1 = require("./utils/retry");
Object.defineProperty(exports, "withRetry", { enumerable: true, get: function () { return retry_1.withRetry; } });
Object.defineProperty(exports, "exponentialBackoff", { enumerable: true, get: function () { return retry_1.exponentialBackoff; } });
// Default export - Now uses NEAR
var client_2 = require("./near/client");
Object.defineProperty(exports, "default", { enumerable: true, get: function () { return client_2.NearOracleClient; } });
//# sourceMappingURL=index.js.map