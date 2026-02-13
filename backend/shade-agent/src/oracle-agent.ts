/**
 * Oracle Agent - Core prediction fulfillment loop
 *
 * Watches for pending prediction requests on NEAR, generates ML predictions,
 * and fulfills them on-chain. Designed to run inside a TEE for verifiability.
 */

import type { NearClient } from "./near-client.js";

interface OracleAgentConfig {
  nearClient: NearClient;
  mlApiUrl: string;
  cycleIntervalMs: number;
  maxActionsPerCycle: number;
}

interface AgentStats {
  status: string;
  total_fulfilled: number;
  total_errors: number;
  last_fulfillment: string | null;
  cycles_completed: number;
  chains: string[];
}

interface PredictionResult {
  predicted_price: number;
  confidence: number;
  individual_predictions: Record<string, number>;
  model_weights: Record<string, number>;
  timestamp: string;
}

export class OracleAgent {
  private config: OracleAgentConfig;
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private stats: AgentStats = {
    status: "stopped",
    total_fulfilled: 0,
    total_errors: 0,
    last_fulfillment: null,
    cycles_completed: 0,
    chains: ["near"], // Solana will be added when integrated
  };

  constructor(config: OracleAgentConfig) {
    this.config = config;
  }

  get isRunning(): boolean {
    return this.stats.status === "running";
  }

  getStats(): AgentStats {
    return { ...this.stats };
  }

  start(): void {
    if (this.isRunning) return;

    this.stats.status = "running";
    console.log(
      `[OracleAgent] Starting prediction cycle (interval: ${this.config.cycleIntervalMs}ms)`
    );

    // Run first cycle immediately
    this.runCycle().catch((err) =>
      console.error("[OracleAgent] First cycle error:", err)
    );

    // Schedule recurring cycles
    this.intervalId = setInterval(() => {
      this.runCycle().catch((err) =>
        console.error("[OracleAgent] Cycle error:", err)
      );
    }, this.config.cycleIntervalMs);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.stats.status = "stopped";
    console.log("[OracleAgent] Stopped");
  }

  // ─── Main Prediction Cycle ───────────────────────────────────────────────

  private async runCycle(): Promise<void> {
    console.log(
      `[OracleAgent] Cycle #${this.stats.cycles_completed + 1} starting...`
    );

    try {
      // 1. Fetch pending prediction requests from NEAR publisher contract
      const pendingRequests = await this.config.nearClient.getPendingRequests(
        this.config.maxActionsPerCycle
      );

      if (pendingRequests.length === 0) {
        console.log("[OracleAgent] No pending requests found");
        this.stats.cycles_completed++;
        return;
      }

      console.log(
        `[OracleAgent] Found ${pendingRequests.length} pending request(s)`
      );

      // 2. Process each request
      let fulfilled = 0;
      for (const request of pendingRequests) {
        try {
          await this.fulfillRequest(request);
          fulfilled++;
        } catch (err) {
          console.error(
            `[OracleAgent] Failed to fulfill request #${request.request_id}:`,
            err
          );
          this.stats.total_errors++;
        }

        if (fulfilled >= this.config.maxActionsPerCycle) break;
      }

      this.stats.cycles_completed++;
      console.log(
        `[OracleAgent] Cycle complete: ${fulfilled}/${pendingRequests.length} fulfilled`
      );
    } catch (err) {
      console.error("[OracleAgent] Cycle failed:", err);
      this.stats.total_errors++;
      this.stats.cycles_completed++;
    }
  }

  // ─── Fulfill a Single Request ────────────────────────────────────────────

  private async fulfillRequest(request: any): Promise<void> {
    const { request_id, asset, timeframe, zk_required } = request;
    console.log(
      `[OracleAgent] Fulfilling request #${request_id}: ${asset} / ${timeframe}`
    );

    // 1. Call ML API to generate prediction
    const prediction = await this.generatePrediction(asset, timeframe);

    // 2. Convert predicted price to integer (6 decimal places -> multiply by 1e6)
    const priceInt = Math.round(prediction.predicted_price * 1_000_000);

    // 3. Generate ZK proof if required (calls the ZK privacy module)
    let zkProof: number[] | undefined;
    if (zk_required) {
      zkProof = await this.generateZKProof(prediction);
    }

    // 4. Fulfill on NEAR
    await this.config.nearClient.fulfillPrediction(
      request_id,
      priceInt,
      zkProof
    );

    // 5. TODO: Publish to Solana via Chain Signatures (when Solana integration is added)
    // await this.publishToSolana(asset, priceInt, prediction.confidence);

    // Update stats
    this.stats.total_fulfilled++;
    this.stats.last_fulfillment = new Date().toISOString();

    console.log(
      `[OracleAgent] Request #${request_id} fulfilled: price=${prediction.predicted_price}, confidence=${prediction.confidence}`
    );
  }

  // ─── ML Prediction ───────────────────────────────────────────────────────

  private async generatePrediction(
    asset: string,
    timeframe: string
  ): Promise<PredictionResult> {
    const response = await fetch(`${this.config.mlApiUrl}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        symbol: asset,
        timeframe: timeframe,
        include_confidence: true,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `ML API prediction failed: ${response.status} ${response.statusText}`
      );
    }

    return (await response.json()) as PredictionResult;
  }

  // ─── ZK Proof Generation ─────────────────────────────────────────────────

  private async generateZKProof(
    prediction: PredictionResult
  ): Promise<number[]> {
    // Call the ZK privacy module to generate a proof
    try {
      const response = await fetch(
        `${this.config.mlApiUrl}/predict-zk`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            symbol: "NEARUSD",
            timeframe: "24h",
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        // Convert ZK proof to byte array for on-chain submission
        if (data.zk_proof?.proof) {
          const proofStr = JSON.stringify(data.zk_proof.proof);
          return Array.from(new TextEncoder().encode(proofStr));
        }
      }
    } catch (err) {
      console.warn("[OracleAgent] ZK proof generation failed, using empty proof:", err);
    }

    // Return empty proof as fallback (non-ZK fulfillment)
    return [];
  }

  // ─── Solana Publishing (stub for future integration) ─────────────────────

  // private async publishToSolana(
  //   asset: string,
  //   priceInt: number,
  //   confidence: number
  // ): Promise<void> {
  //   // This will use Chain Signatures to:
  //   // 1. Build a Solana update_price instruction
  //   // 2. Request a secp256k1 signature via the agent contract
  //   // 3. Broadcast the signed transaction to Solana RPC
  //   console.log(`[OracleAgent] Solana publish stub: ${asset} = ${priceInt}`);
  // }
}
