/**
 * Apollon Shade Agent - Autonomous TEE-based Multichain Price Oracle
 *
 * This agent runs inside a TEE (Trusted Execution Environment) and:
 * 1. Watches the NEAR publisher contract for pending prediction requests
 * 2. Calls the ML prediction API to generate price predictions
 * 3. Fulfills predictions on NEAR (and Solana when integrated)
 * 4. Provides TEE attestation proof that correct ML code was executed
 */

import { Hono } from "hono";
import { OracleAgent } from "./oracle-agent.js";
import { NearClient } from "./near-client.js";

const app = new Hono();
const PORT = parseInt(process.env.PORT || "3100");

// Agent state
let agent: OracleAgent | null = null;
let agentStartTime: Date | null = null;

// ─── Health & Status ─────────────────────────────────────────────────────────

app.get("/", (c) => {
  return c.json({
    name: "Apollon Shade Agent",
    version: "1.0.0",
    description: "Autonomous TEE-based multichain price oracle",
    status: agent?.isRunning ? "running" : "stopped",
    uptime: agentStartTime
      ? Math.floor((Date.now() - agentStartTime.getTime()) / 1000)
      : 0,
  });
});

app.get("/health", (c) => {
  return c.json({
    status: agent?.isRunning ? "healthy" : "stopped",
    timestamp: new Date().toISOString(),
  });
});

app.get("/status", (c) => {
  const stats = agent?.getStats() ?? {
    status: "not_initialized",
    total_fulfilled: 0,
    last_fulfillment: null,
    cycles_completed: 0,
    errors: 0,
    chains: ["near"],
  };

  return c.json({
    ...stats,
    uptime: agentStartTime
      ? Math.floor((Date.now() - agentStartTime.getTime()) / 1000)
      : 0,
    timestamp: new Date().toISOString(),
  });
});

// ─── TEE Attestation ─────────────────────────────────────────────────────────

app.get("/attestation", (c) => {
  // In a real TEE deployment, this would return the remote attestation quote
  // and code hash from the TEE environment (e.g., Intel SGX/TDX or AMD SEV)
  return c.json({
    available: process.env.TEE_ENABLED === "true",
    agent_account: process.env.NEAR_AGENT_ACCOUNT_ID || null,
    code_hash: process.env.CODE_HASH || null,
    tee_type: process.env.TEE_TYPE || "development",
    attestation_quote: process.env.TEE_ATTESTATION_QUOTE || null,
    message:
      process.env.TEE_ENABLED === "true"
        ? "TEE attestation available"
        : "Running in development mode (no TEE)",
    timestamp: new Date().toISOString(),
  });
});

// ─── Agent Control ───────────────────────────────────────────────────────────

app.post("/start", async (c) => {
  if (agent?.isRunning) {
    return c.json({ message: "Agent already running" }, 409);
  }

  try {
    await initAgent();
    agent?.start();
    return c.json({ message: "Agent started", status: "running" });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return c.json({ message: `Failed to start agent: ${msg}` }, 500);
  }
});

app.post("/stop", (c) => {
  if (!agent?.isRunning) {
    return c.json({ message: "Agent not running" }, 409);
  }

  agent.stop();
  return c.json({ message: "Agent stopped", status: "stopped" });
});

// ─── Initialization ──────────────────────────────────────────────────────────

async function initAgent() {
  const nearClient = new NearClient({
    networkId: (process.env.NEAR_NETWORK as "testnet" | "mainnet") || "testnet",
    nodeUrl: process.env.NEAR_NODE_URL || "https://rpc.testnet.near.org",
    publisherContract:
      process.env.NEAR_PUBLISHER_CONTRACT || "apollon-publisher.testnet",
    agentAccountId: process.env.NEAR_AGENT_ACCOUNT_ID || "",
    agentPrivateKey: process.env.NEAR_AGENT_PRIVATE_KEY || "",
  });

  await nearClient.initialize();

  agent = new OracleAgent({
    nearClient,
    mlApiUrl: process.env.ML_API_URL || "http://localhost:8000",
    cycleIntervalMs: parseInt(process.env.AGENT_CYCLE_INTERVAL_MS || "30000"),
    maxActionsPerCycle: parseInt(
      process.env.SHADE_AGENT_MAX_ACTIONS_PER_CYCLE || "10"
    ),
  });

  agentStartTime = new Date();
}

// ─── Startup ─────────────────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════════════════");
  console.log("  Apollon Shade Agent v1.0.0");
  console.log("  Autonomous TEE-based Multichain Price Oracle");
  console.log("═══════════════════════════════════════════════════════");
  console.log(`  NEAR Network: ${process.env.NEAR_NETWORK || "testnet"}`);
  console.log(
    `  Publisher:     ${process.env.NEAR_PUBLISHER_CONTRACT || "apollon-publisher.testnet"}`
  );
  console.log(`  ML API:        ${process.env.ML_API_URL || "http://localhost:8000"}`);
  console.log(`  TEE Mode:      ${process.env.TEE_ENABLED === "true" ? "ENABLED" : "development"}`);
  console.log("═══════════════════════════════════════════════════════");

  // Auto-start agent if configured
  const autoStart = process.env.AGENT_AUTO_START !== "false";
  if (autoStart) {
    try {
      await initAgent();
      agent?.start();
      console.log("Agent auto-started successfully");
    } catch (error) {
      console.error("Failed to auto-start agent:", error);
      console.log("Agent can be started manually via POST /start");
    }
  }

  // Start HTTP server
  console.log(`HTTP server listening on port ${PORT}`);

  try {
    const { serve } = await import("@hono/node-server");
    serve({ fetch: app.fetch, port: PORT });
  } catch {
    // Fallback: export for other runtimes (Bun, Deno, etc.)
    console.log(
      "Note: @hono/node-server not available, export app for your runtime"
    );
  }
}

main().catch(console.error);

export default app;
