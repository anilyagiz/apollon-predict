"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NearOracleClient = void 0;
const near_api_js_1 = require("near-api-js");
class NearOracleClient {
    constructor(config) {
        this.near = null;
        this.wallet = null;
        this.account = null;
        this.config = config;
    }
    async initialize() {
        const keyStore = new near_api_js_1.keyStores.BrowserLocalStorageKeyStore();
        const config = {
            networkId: this.config.networkId,
            keyStore,
            nodeUrl: this.config.nodeUrl || `https://rpc.${this.config.networkId}.near.org`,
            walletUrl: this.config.walletUrl || `https://wallet.${this.config.networkId}.near.org`,
            helperUrl: this.config.helperUrl || `https://helper.${this.config.networkId}.near.org`,
            explorerUrl: this.config.explorerUrl || `https://explorer.${this.config.networkId}.near.org`,
        };
        this.near = await (0, near_api_js_1.connect)(config);
        this.wallet = new near_api_js_1.WalletConnection(this.near, 'apollon-oracle');
    }
    isSignedIn() {
        return this.wallet?.isSignedIn() ?? false;
    }
    async signIn() {
        if (!this.wallet) {
            throw new Error('Client not initialized. Call initialize() first.');
        }
        await this.wallet.requestSignIn({
            contractId: this.config.publisherContract,
            methodNames: ['request_prediction', 'cancel_request'],
            keyType: 'ed25519',
        });
    }
    signOut() {
        this.wallet?.signOut();
        this.account = null;
    }
    getAccountId() {
        return this.wallet?.getAccountId() ?? null;
    }
    async requestPrediction(request, deposit = '0.1') {
        if (!this.wallet || !this.wallet.isSignedIn()) {
            throw new Error('Not signed in. Call signIn() first.');
        }
        const account = this.wallet.account();
        const result = await account.functionCall({
            contractId: this.config.publisherContract,
            methodName: 'request_prediction',
            args: {
                asset: request.asset,
                timeframe: request.timeframe,
                zk_required: request.zkRequired,
            },
            attachedDeposit: BigInt(this.nearToYocto(deposit)),
            gas: BigInt('50000000000000'), // 50 TGas
        });
        const status = result.status;
        const requestId = status.SuccessValue ?
            JSON.parse(Buffer.from(status.SuccessValue, 'base64').toString()) :
            null;
        return requestId;
    }
    async getRequest(requestId) {
        if (!this.near) {
            throw new Error('Client not initialized. Call initialize() first.');
        }
        const account = await this.near.account(this.config.publisherContract);
        try {
            const result = await account.viewFunction({
                contractId: this.config.publisherContract,
                methodName: 'get_request',
                args: { request_id: requestId },
            });
            if (!result)
                return null;
            return {
                requestId: result.request_id,
                asset: result.asset,
                timeframe: result.timeframe,
                predictedPrice: result.predicted_price,
                zkVerified: result.zk_verified,
                status: result.status,
            };
        }
        catch (error) {
            console.error('Error fetching request:', error);
            return null;
        }
    }
    async getPendingRequests(limit = 10) {
        if (!this.near) {
            throw new Error('Client not initialized. Call initialize() first.');
        }
        const account = await this.near.account(this.config.publisherContract);
        try {
            const results = await account.viewFunction({
                contractId: this.config.publisherContract,
                methodName: 'get_pending_requests',
                args: { limit },
            });
            return results.map((r) => ({
                requestId: r.request_id,
                asset: r.asset,
                timeframe: r.timeframe,
                predictedPrice: r.predicted_price,
                zkVerified: r.zk_verified,
                status: r.status,
            }));
        }
        catch (error) {
            console.error('Error fetching pending requests:', error);
            return [];
        }
    }
    async cancelRequest(requestId) {
        if (!this.wallet || !this.wallet.isSignedIn()) {
            throw new Error('Not signed in. Call signIn() first.');
        }
        const account = this.wallet.account();
        await account.functionCall({
            contractId: this.config.publisherContract,
            methodName: 'cancel_request',
            args: { request_id: requestId },
            gas: BigInt('50000000000000'), // 50 TGas
        });
    }
    async fulfillPrediction(requestId, predictedPrice, zkProof) {
        if (!this.wallet || !this.wallet.isSignedIn()) {
            throw new Error('Not signed in. Call signIn() first.');
        }
        const account = this.wallet.account();
        await account.functionCall({
            contractId: this.config.publisherContract,
            methodName: 'fulfill_prediction',
            args: {
                request_id: requestId,
                predicted_price: predictedPrice,
                zk_proof: zkProof ? Array.from(zkProof) : undefined,
            },
            gas: BigInt('50000000000000'), // 50 TGas
        });
    }
    // ===========================================================================
    // Token Swap / Intent Methods (via 1Click API backend)
    // ===========================================================================
    /**
     * Get supported tokens for cross-chain swaps.
     */
    async getSwapTokens(chain) {
        const url = chain
            ? `${this.getApiUrl()}/swap/tokens?chain=${chain}`
            : `${this.getApiUrl()}/swap/tokens`;
        const resp = await fetch(url);
        if (!resp.ok)
            throw new Error(`Failed to fetch swap tokens: ${resp.status}`);
        const data = await resp.json();
        return data.tokens || [];
    }
    /**
     * Get supported chains for cross-chain swaps.
     */
    async getSwapChains() {
        const resp = await fetch(`${this.getApiUrl()}/swap/chains`);
        if (!resp.ok)
            throw new Error(`Failed to fetch chains: ${resp.status}`);
        const data = await resp.json();
        return data.chains || [];
    }
    /**
     * Get a swap quote from NEAR Intents 1Click API.
     */
    async getSwapQuote(params) {
        const resp = await fetch(`${this.getApiUrl()}/swap/quote`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                origin_asset: params.originAsset,
                destination_asset: params.destinationAsset,
                amount: params.amount,
                recipient: params.recipient,
                refund_to: params.refundTo || params.recipient,
                slippage_tolerance: params.slippageTolerance || 100,
                dry: true,
            }),
        });
        if (!resp.ok)
            throw new Error(`Swap quote failed: ${resp.status}`);
        return await resp.json();
    }
    /**
     * Execute a cross-chain swap. Returns deposit address.
     */
    async executeSwap(params) {
        const resp = await fetch(`${this.getApiUrl()}/swap/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                origin_asset: params.originAsset,
                destination_asset: params.destinationAsset,
                amount: params.amount,
                recipient: params.recipient,
                refund_to: params.refundTo || params.recipient,
                slippage_tolerance: params.slippageTolerance || 100,
            }),
        });
        if (!resp.ok)
            throw new Error(`Swap execution failed: ${resp.status}`);
        return await resp.json();
    }
    /**
     * Check the status of a cross-chain swap.
     */
    async getSwapStatus(depositAddress) {
        const resp = await fetch(`${this.getApiUrl()}/swap/status/${depositAddress}`);
        if (!resp.ok)
            throw new Error(`Status check failed: ${resp.status}`);
        return await resp.json();
    }
    /**
     * Get a quote for paying for a prediction via cross-chain intent.
     */
    async getPredictionPaymentQuote(params) {
        const resp = await fetch(`${this.getApiUrl()}/intents/prediction/quote`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                origin_asset: params.originAsset,
                amount: params.amount,
                recipient_near_account: this.config.publisherContract,
                refund_to: params.refundTo,
            }),
        });
        if (!resp.ok)
            throw new Error(`Payment quote failed: ${resp.status}`);
        return await resp.json();
    }
    /**
     * Execute a cross-chain prediction payment.
     */
    async executePredictionPayment(params) {
        const resp = await fetch(`${this.getApiUrl()}/intents/prediction/execute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                origin_asset: params.originAsset,
                amount: params.amount,
                recipient_near_account: this.config.publisherContract,
                refund_to: params.refundTo,
            }),
        });
        if (!resp.ok)
            throw new Error(`Payment execution failed: ${resp.status}`);
        return await resp.json();
    }
    /**
     * Get Shade Agent oracle status.
     */
    async getAgentStatus() {
        const resp = await fetch(`${this.getApiUrl()}/agent/status`);
        if (!resp.ok)
            throw new Error(`Agent status failed: ${resp.status}`);
        return await resp.json();
    }
    // ===========================================================================
    // Private helpers
    // ===========================================================================
    getApiUrl() {
        // Use the API URL from config or default
        return this.config.apiUrl || 'http://localhost:8000';
    }
    nearToYocto(near) {
        const parts = near.split('.');
        const whole = parts[0];
        const fraction = (parts[1] || '').padEnd(24, '0').slice(0, 24);
        return whole + fraction;
    }
}
exports.NearOracleClient = NearOracleClient;
exports.default = NearOracleClient;
//# sourceMappingURL=client.js.map