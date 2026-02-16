"use strict";
/**
 * Main Apollon - ZK Oracle Oracle SDK Client
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlgoZKOracleClient = void 0;
const axios_1 = __importDefault(require("axios"));
const errors_1 = require("../utils/errors");
const retry_1 = require("../utils/retry");
const zk_verifier_1 = require("../utils/zk-verifier");
class AlgoZKOracleClient {
    constructor(config) {
        this.config = {
            timeout: 30000,
            retries: 3,
            retryDelay: 1000,
            enableZKVerification: true,
            ...config,
        };
        this.http = axios_1.default.create({
            baseURL: this.config.baseURL,
            timeout: this.config.timeout,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': '@algo-zk/oracle-sdk/1.0.0',
            },
        });
        this.zkVerifier = new zk_verifier_1.ZKVerifier();
        this.setupInterceptors();
    }
    /**
     * Initialize ZK verification (optional)
     */
    async initializeZKVerification(verificationKeyUrl) {
        if (!this.config.enableZKVerification)
            return;
        const vkUrl = verificationKeyUrl || `${this.config.baseURL.replace('/api', '')}/verification_key.json`;
        try {
            await this.zkVerifier.loadVerificationKey(vkUrl);
        }
        catch (error) {
            console.warn('Failed to load ZK verification key:', error);
        }
    }
    /**
     * Setup HTTP interceptors for error handling
     */
    setupInterceptors() {
        this.http.interceptors.response.use((response) => response, (error) => {
            if (error.response) {
                const status = error.response.status;
                const data = error.response.data;
                switch (status) {
                    case 400:
                        throw new errors_1.ValidationError(data.detail || 'Invalid request');
                    case 429:
                        throw new errors_1.RateLimitError(data.detail || 'Rate limit exceeded');
                    case 503:
                        if (data.detail?.includes('training')) {
                            throw new errors_1.ModelNotReadyError(data.detail);
                        }
                        throw new errors_1.NetworkError(data.detail || 'Service unavailable');
                    case 500:
                        throw new errors_1.AlgoZKOracleError('SERVER_ERROR', data.detail || 'Internal server error');
                    default:
                        throw new errors_1.NetworkError(`HTTP ${status}: ${data.detail || error.message}`);
                }
            }
            if (error.request) {
                throw new errors_1.NetworkError('Network error: No response received');
            }
            throw new errors_1.AlgoZKOracleError('UNKNOWN_ERROR', error.message);
        });
    }
    /**
     * Check API health status
     */
    async health() {
        return (0, retry_1.withRetry)(async () => {
            const response = await this.http.get('/health');
            return response.data;
        });
    }
    /**
     * Get current aggregated price
     */
    async getCurrentPrice() {
        return (0, retry_1.withRetry)(async () => {
            const response = await this.http.get('/price/current');
            return response.data;
        });
    }
    /**
     * Get technical indicators
     */
    async getTechnicalIndicators() {
        return (0, retry_1.withRetry)(async () => {
            const response = await this.http.get('/price/technicals');
            return response.data;
        });
    }
    /**
     * Get historical price data
     */
    async getHistoricalData(days = 30) {
        if (days > 365) {
            throw new errors_1.ValidationError('Maximum historical data period is 365 days');
        }
        return (0, retry_1.withRetry)(async () => {
            const response = await this.http.get(`/price/historical?days=${days}`);
            return response.data;
        });
    }
    /**
     * Get model training status
     */
    async getModelStatus() {
        return (0, retry_1.withRetry)(async () => {
            const response = await this.http.get('/models/status');
            return response.data;
        });
    }
    /**
     * Generate price prediction
     */
    async predict(request = {}) {
        const payload = {
            symbol: 'ALGOUSD',
            timeframe: '24h',
            include_confidence: true,
            include_technicals: false,
            ...request,
        };
        return (0, retry_1.withRetry)(async () => {
            const response = await this.http.post('/predict', payload);
            return response.data;
        });
    }
    /**
     * Generate privacy-enhanced prediction with ZK proof
     */
    async predictWithZK(request = {}) {
        const payload = {
            symbol: 'ALGOUSD',
            timeframe: '24h',
            include_confidence: true,
            include_technicals: false,
            ...request,
        };
        return (0, retry_1.withRetry)(async () => {
            const response = await this.http.post('/predict-zk', payload);
            const result = response.data;
            // Verify ZK proof if enabled
            if (this.config.enableZKVerification && result.zk_proof) {
                try {
                    const verification = await this.zkVerifier.verifyComplete(result.zk_proof, result.predicted_price);
                    if (!verification.overallValid) {
                        console.warn('ZK proof verification failed:', verification);
                    }
                    // Add verification result to response
                    result.privacy_status.circuit_verified = verification.overallValid;
                }
                catch (error) {
                    console.warn('ZK verification error:', error);
                }
            }
            return result;
        });
    }
    /**
     * Verify a ZK proof independently
     */
    async verifyZKProof(proof, publicSignals) {
        const response = await this.http.post('/verify-zk', {
            proof,
            public_signals: publicSignals,
        });
        return response.data.verified;
    }
    /**
     * Trigger model retraining (admin function)
     */
    async retrainModels() {
        const response = await this.http.post('/models/retrain');
        return response.data;
    }
    /**
     * Wait for models to be ready
     */
    async waitForModels(maxWaitTime = 300000) {
        const startTime = Date.now();
        while (Date.now() - startTime < maxWaitTime) {
            try {
                const health = await this.health();
                if (health.models_trained) {
                    return true;
                }
            }
            catch (error) {
                // Continue waiting on errors
            }
            await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        }
        return false;
    }
}
exports.AlgoZKOracleClient = AlgoZKOracleClient;
//# sourceMappingURL=oracle-client.js.map