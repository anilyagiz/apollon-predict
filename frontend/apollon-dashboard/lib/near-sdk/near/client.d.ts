export interface NearOracleConfig {
    networkId: 'testnet' | 'mainnet';
    nodeUrl?: string;
    walletUrl?: string;
    helperUrl?: string;
    explorerUrl?: string;
    publisherContract: string;
    verifierContract?: string;
    /** Backend API URL for swap/intent endpoints (default: http://localhost:8000) */
    apiUrl?: string;
}
export interface PredictionRequest {
    asset: string;
    timeframe: string;
    zkRequired: boolean;
}
export interface PredictionResponse {
    requestId: number;
    asset: string;
    timeframe: string;
    predictedPrice?: number;
    zkVerified?: boolean;
    status: 'Pending' | 'Fulfilled' | 'Expired' | 'Cancelled';
}
export declare class NearOracleClient {
    private near;
    private wallet;
    private account;
    private config;
    constructor(config: NearOracleConfig);
    initialize(): Promise<void>;
    isSignedIn(): boolean;
    signIn(): Promise<void>;
    signOut(): void;
    getAccountId(): string | null;
    requestPrediction(request: PredictionRequest, deposit?: string): Promise<number>;
    getRequest(requestId: number): Promise<PredictionResponse | null>;
    getPendingRequests(limit?: number): Promise<PredictionResponse[]>;
    cancelRequest(requestId: number): Promise<void>;
    fulfillPrediction(requestId: number, predictedPrice: number, zkProof?: Uint8Array): Promise<void>;
    /**
     * Get supported tokens for cross-chain swaps.
     */
    getSwapTokens(chain?: string): Promise<any[]>;
    /**
     * Get supported chains for cross-chain swaps.
     */
    getSwapChains(): Promise<any[]>;
    /**
     * Get a swap quote from NEAR Intents 1Click API.
     */
    getSwapQuote(params: {
        originAsset: string;
        destinationAsset: string;
        amount: string;
        recipient: string;
        refundTo?: string;
        slippageTolerance?: number;
    }): Promise<any>;
    /**
     * Execute a cross-chain swap. Returns deposit address.
     */
    executeSwap(params: {
        originAsset: string;
        destinationAsset: string;
        amount: string;
        recipient: string;
        refundTo?: string;
        slippageTolerance?: number;
    }): Promise<{
        depositAddress: string;
        quote: any;
    }>;
    /**
     * Check the status of a cross-chain swap.
     */
    getSwapStatus(depositAddress: string): Promise<{
        status: string;
        [key: string]: any;
    }>;
    /**
     * Get a quote for paying for a prediction via cross-chain intent.
     */
    getPredictionPaymentQuote(params: {
        originAsset: string;
        amount: string;
        refundTo: string;
    }): Promise<any>;
    /**
     * Execute a cross-chain prediction payment.
     */
    executePredictionPayment(params: {
        originAsset: string;
        amount: string;
        refundTo: string;
    }): Promise<{
        depositAddress: string;
        quote: any;
    }>;
    /**
     * Get Shade Agent oracle status.
     */
    getAgentStatus(): Promise<{
        enabled: boolean;
        status: string;
        total_fulfilled: number;
        last_fulfillment: string | null;
        tee_attestation: string | null;
        chains: string[];
    }>;
    private getApiUrl;
    private nearToYocto;
}
export default NearOracleClient;
//# sourceMappingURL=client.d.ts.map