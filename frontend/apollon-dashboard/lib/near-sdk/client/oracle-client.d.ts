/**
 * Main Apollon - ZK Oracle Oracle SDK Client
 */
import { SDKConfig, PredictionRequest, PredictionResponse, ZKPredictionResponse, CurrentPriceResponse, TechnicalIndicatorsResponse, HealthResponse, HistoricalDataResponse, ModelStatusResponse } from '../types';
export declare class AlgoZKOracleClient {
    private http;
    private zkVerifier;
    private config;
    constructor(config: SDKConfig);
    /**
     * Initialize ZK verification (optional)
     */
    initializeZKVerification(verificationKeyUrl?: string): Promise<void>;
    /**
     * Setup HTTP interceptors for error handling
     */
    private setupInterceptors;
    /**
     * Check API health status
     */
    health(): Promise<HealthResponse>;
    /**
     * Get current aggregated price
     */
    getCurrentPrice(): Promise<CurrentPriceResponse>;
    /**
     * Get technical indicators
     */
    getTechnicalIndicators(): Promise<TechnicalIndicatorsResponse>;
    /**
     * Get historical price data
     */
    getHistoricalData(days?: number): Promise<HistoricalDataResponse>;
    /**
     * Get model training status
     */
    getModelStatus(): Promise<ModelStatusResponse>;
    /**
     * Generate price prediction
     */
    predict(request?: PredictionRequest): Promise<PredictionResponse>;
    /**
     * Generate privacy-enhanced prediction with ZK proof
     */
    predictWithZK(request?: PredictionRequest): Promise<ZKPredictionResponse>;
    /**
     * Verify a ZK proof independently
     */
    verifyZKProof(proof: any, publicSignals: string[]): Promise<boolean>;
    /**
     * Trigger model retraining (admin function)
     */
    retrainModels(): Promise<{
        message: string;
        timestamp: string;
    }>;
    /**
     * Wait for models to be ready
     */
    waitForModels(maxWaitTime?: number): Promise<boolean>;
}
//# sourceMappingURL=oracle-client.d.ts.map