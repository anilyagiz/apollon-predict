import { connect, keyStores, WalletConnection, Near } from 'near-api-js';
import type { Account } from 'near-api-js';

export interface NearOracleConfig {
  networkId: 'testnet' | 'mainnet';
  nodeUrl?: string;
  walletUrl?: string;
  helperUrl?: string;
  explorerUrl?: string;
  publisherContract: string;
  verifierContract?: string;
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

export class NearOracleClient {
  private near: Near | null = null;
  private wallet: WalletConnection | null = null;
  private account: Account | null = null;
  private config: NearOracleConfig;

  constructor(config: NearOracleConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    const keyStore = new keyStores.BrowserLocalStorageKeyStore();
    
    const config = {
      networkId: this.config.networkId,
      keyStore,
      nodeUrl: this.config.nodeUrl || `https://rpc.${this.config.networkId}.near.org`,
      walletUrl: this.config.walletUrl || `https://wallet.${this.config.networkId}.near.org`,
      helperUrl: this.config.helperUrl || `https://helper.${this.config.networkId}.near.org`,
      explorerUrl: this.config.explorerUrl || `https://explorer.${this.config.networkId}.near.org`,
    };

    this.near = await connect(config);
    this.wallet = new WalletConnection(this.near, 'apollon-oracle');
  }

  isSignedIn(): boolean {
    return this.wallet?.isSignedIn() ?? false;
  }

  async signIn(): Promise<void> {
    if (!this.wallet) {
      throw new Error('Client not initialized. Call initialize() first.');
    }
    
    await this.wallet.requestSignIn({
      contractId: this.config.publisherContract,
      methodNames: ['request_prediction', 'cancel_request'],
      keyType: 'ed25519',
    } as any);
  }

  signOut(): void {
    this.wallet?.signOut();
    this.account = null;
  }

  getAccountId(): string | null {
    return this.wallet?.getAccountId() ?? null;
  }

  async requestPrediction(request: PredictionRequest, deposit: string = '0.1'): Promise<number> {
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

    const status = result.status as any;
    const requestId = status.SuccessValue ? 
      JSON.parse(Buffer.from(status.SuccessValue, 'base64').toString()) : 
      null;
    
    return requestId;
  }

  async getRequest(requestId: number): Promise<PredictionResponse | null> {
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

      if (!result) return null;

      return {
        requestId: result.request_id,
        asset: result.asset,
        timeframe: result.timeframe,
        predictedPrice: result.predicted_price,
        zkVerified: result.zk_verified,
        status: result.status,
      };
    } catch (error) {
      console.error('Error fetching request:', error);
      return null;
    }
  }

  async getPendingRequests(limit: number = 10): Promise<PredictionResponse[]> {
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

      return results.map((r: any) => ({
        requestId: r.request_id,
        asset: r.asset,
        timeframe: r.timeframe,
        predictedPrice: r.predicted_price,
        zkVerified: r.zk_verified,
        status: r.status,
      }));
    } catch (error) {
      console.error('Error fetching pending requests:', error);
      return [];
    }
  }

  async cancelRequest(requestId: number): Promise<void> {
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

  async fulfillPrediction(
    requestId: number,
    predictedPrice: number,
    zkProof?: Uint8Array
  ): Promise<void> {
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

  private nearToYocto(near: string): string {
    const parts = near.split('.');
    const whole = parts[0];
    const fraction = (parts[1] || '').padEnd(24, '0').slice(0, 24);
    return whole + fraction;
  }
}

export default NearOracleClient;
