/**
 * NEAR Client for Shade Agent
 *
 * Handles NEAR RPC interactions:
 * - Reading pending prediction requests from the publisher contract
 * - Fulfilling predictions via function calls
 * - Chain Signatures for cross-chain signing (Solana)
 */

import { connect, keyStores, KeyPair, Near } from "near-api-js";
import type { Account } from "near-api-js";

interface NearClientConfig {
  networkId: "testnet" | "mainnet";
  nodeUrl: string;
  publisherContract: string;
  agentAccountId: string;
  agentPrivateKey: string;
}

interface PendingRequest {
  request_id: number;
  requester: string;
  asset: string;
  timeframe: string;
  zk_required: boolean;
  deposit: string;
  status: string;
  created_at: number;
  expires_at: number;
}

export class NearClient {
  private config: NearClientConfig;
  private near: Near | null = null;
  private account: Account | null = null;

  constructor(config: NearClientConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    const keyStore = new keyStores.InMemoryKeyStore();

    // Add agent key if provided
    if (this.config.agentAccountId && this.config.agentPrivateKey) {
      const keyPair = KeyPair.fromString(this.config.agentPrivateKey as any);
      await keyStore.setKey(
        this.config.networkId,
        this.config.agentAccountId,
        keyPair
      );
    }

    this.near = await connect({
      networkId: this.config.networkId,
      keyStore,
      nodeUrl: this.config.nodeUrl,
    });

    if (this.config.agentAccountId) {
      this.account = await this.near.account(this.config.agentAccountId);
      console.log(
        `[NearClient] Initialized with account: ${this.config.agentAccountId}`
      );
    } else {
      console.log("[NearClient] Initialized in read-only mode (no agent key)");
    }
  }

  // ─── Read Operations ─────────────────────────────────────────────────────

  async getPendingRequests(limit: number = 10): Promise<PendingRequest[]> {
    if (!this.near) throw new Error("NearClient not initialized");

    const viewAccount = await this.near.account(this.config.publisherContract);

    try {
      const results = await viewAccount.viewFunction({
        contractId: this.config.publisherContract,
        methodName: "get_pending_requests",
        args: { limit },
      });

      return results as PendingRequest[];
    } catch (err) {
      console.error("[NearClient] Failed to fetch pending requests:", err);
      return [];
    }
  }

  async getRequest(requestId: number): Promise<PendingRequest | null> {
    if (!this.near) throw new Error("NearClient not initialized");

    const viewAccount = await this.near.account(this.config.publisherContract);

    try {
      const result = await viewAccount.viewFunction({
        contractId: this.config.publisherContract,
        methodName: "get_request",
        args: { request_id: requestId },
      });

      return result as PendingRequest | null;
    } catch (err) {
      console.error(`[NearClient] Failed to fetch request #${requestId}:`, err);
      return null;
    }
  }

  // ─── Write Operations ────────────────────────────────────────────────────

  async fulfillPrediction(
    requestId: number,
    predictedPrice: number,
    zkProof?: number[]
  ): Promise<void> {
    if (!this.account) {
      throw new Error(
        "NearClient not initialized with signing account. Set NEAR_AGENT_ACCOUNT_ID and NEAR_AGENT_PRIVATE_KEY."
      );
    }

    console.log(
      `[NearClient] Fulfilling request #${requestId} with price ${predictedPrice}`
    );

    await this.account.functionCall({
      contractId: this.config.publisherContract,
      methodName: "fulfill_prediction",
      args: {
        request_id: requestId,
        predicted_price: predictedPrice,
        zk_proof: zkProof || null,
      },
      gas: BigInt("100000000000000"), // 100 TGas
    });

    console.log(`[NearClient] Request #${requestId} fulfilled on NEAR`);
  }

  // ─── Chain Signatures (for Solana cross-chain publishing) ────────────────

  // async requestSignature(
  //   payload: Uint8Array,
  //   keyType: "Ecdsa" | "Ed25519" = "Ecdsa"
  // ): Promise<Uint8Array> {
  //   // This will call the agent contract's request_signature method
  //   // which uses NEAR Chain Signatures MPC to produce a signature
  //   // for signing Solana transactions
  //   //
  //   // Implementation will be added when Solana integration is active
  //   throw new Error("Chain Signatures not yet implemented");
  // }

  // ─── Utilities ────────────────────────────────────────────────────────────

  getAccountId(): string | null {
    return this.config.agentAccountId || null;
  }

  getPublisherContract(): string {
    return this.config.publisherContract;
  }
}
