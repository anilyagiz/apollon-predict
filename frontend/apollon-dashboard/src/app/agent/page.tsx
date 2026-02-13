"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import AgentStatus from "@/components/AgentStatus";
import {
  BrainCog,
  ShieldCheck,
  Activity,
  Cpu,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Satellite,
  Lock,
  ScanEye,
} from "lucide-react";

interface AttestationData {
  available: boolean;
  agent_account: string | null;
  code_hash: string | null;
  tee_type: string;
  attestation_quote: string | null;
  message: string;
  timestamp: string;
}

export default function AgentPage() {
  const [attestation, setAttestation] = useState<AttestationData | null>(null);
  const [loadingAttestation, setLoadingAttestation] = useState(true);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    const fetchAttestation = async () => {
      try {
        const resp = await fetch(`${apiUrl}/agent/attestation`);
        if (resp.ok) setAttestation(await resp.json());
      } catch (err) {
        console.error("Failed to fetch attestation:", err);
      } finally {
        setLoadingAttestation(false);
      }
    };
    fetchAttestation();
  }, [apiUrl]);

  return (
    <div className="min-h-screen text-white">
      <Navbar />

      <div className="container mx-auto px-6 py-10 max-w-7xl">
        {/* Page Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/15 flex items-center justify-center">
              <BrainCog className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Oracle Agent</h1>
              <p className="text-gray-500 text-sm">
                Autonomous TEE-based multichain price oracle powered by Shade Protocol
              </p>
            </div>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
          {[
            { icon: <Cpu className="w-7 h-7 text-purple-400" />, title: "TEE Secured", desc: "Runs inside a Trusted Execution Environment for verifiable computation." },
            { icon: <Activity className="w-7 h-7 text-blue-400" />, title: "Autonomous", desc: "Watches for prediction requests and fulfills them automatically on-chain." },
            { icon: <ShieldCheck className="w-7 h-7 text-emerald-400" />, title: "Restricted", desc: "Agent contract limits actions to approved methods only." },
            { icon: <Satellite className="w-7 h-7 text-cyan-400" />, title: "Multichain", desc: "Publishes prices to NEAR, Aurora, and Solana (planned)." },
          ].map((item) => (
            <div key={item.title} className="pyth-card p-5">
              <div className="mb-3">{item.icon}</div>
              <h3 className="text-white font-semibold mb-1 text-sm">{item.title}</h3>
              <p className="text-gray-500 text-xs leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="xl:col-span-1 space-y-6">
            <AgentStatus />

            {/* Agent Architecture */}
            <div className="pyth-card p-6">
              <div className="flex items-center gap-2 mb-5">
                <Lock className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-bold text-white">Agent Architecture</h3>
              </div>
              <div className="space-y-2.5">
                {[
                  { color: "bg-violet-400", name: "Shade Agent", desc: "Hono server running in TEE, executes prediction fulfillment cycles" },
                  { color: "bg-blue-400", name: "Agent Contract", desc: "NEAR smart contract that restricts agent to approved actions only" },
                  { color: "bg-emerald-400", name: "ML Engine", desc: "Ensemble of LSTM, GRU, Prophet, and XGBoost models" },
                  { color: "bg-cyan-400", name: "ZK Prover", desc: "Generates Groth16 proofs to hide model weights" },
                ].map((item) => (
                  <div key={item.name} className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-purple-500/5">
                    <div className={`w-2 h-2 rounded-full ${item.color} mt-1.5 flex-shrink-0`} />
                    <div>
                      <p className="text-white font-medium text-sm">{item.name}</p>
                      <p className="text-gray-600 text-xs">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="xl:col-span-2 space-y-6">
            {/* TEE Attestation */}
            <div className="pyth-card-elevated p-6">
              <div className="flex items-center gap-3 mb-6">
                <ScanEye className="w-5 h-5 text-purple-400" />
                <h2 className="text-lg font-bold text-white">TEE Attestation</h2>
                {attestation?.available ? (
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Verified</span>
                ) : (
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">Development</span>
                )}
              </div>
              {loadingAttestation ? (
                <div className="flex items-center gap-2 text-gray-500">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Loading attestation data...</span>
                </div>
              ) : attestation ? (
                <div className="space-y-3">
                  {[
                    { label: "TEE Type", value: attestation.tee_type || "N/A" },
                    { label: "Agent Account", value: attestation.agent_account || "Not registered", mono: true },
                    { label: "Code Hash", value: attestation.code_hash || "N/A", mono: true },
                    { label: "Status", value: attestation.message },
                  ].map((row) => (
                    <div key={row.label} className="flex justify-between items-start gap-4 py-2 border-b border-purple-500/5 last:border-0">
                      <span className="text-sm text-gray-500 flex-shrink-0">{row.label}</span>
                      <span className={`text-sm text-white text-right ${row.mono ? "font-mono" : ""}`}>{row.value}</span>
                    </div>
                  ))}
                  {attestation.attestation_quote && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Attestation Quote</p>
                      <pre className="text-xs text-gray-400 bg-black/20 rounded-xl p-3 overflow-x-auto border border-purple-500/5">
                        {attestation.attestation_quote}
                      </pre>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-gray-500">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">Could not load attestation data</span>
                </div>
              )}
            </div>

            {/* Fulfillment Cycle */}
            <div className="pyth-card-elevated p-6">
              <div className="flex items-center gap-3 mb-6">
                <Activity className="w-5 h-5 text-blue-400" />
                <h2 className="text-lg font-bold text-white">Prediction Fulfillment Cycle</h2>
              </div>
              <div className="space-y-3">
                {[
                  { step: 1, title: "Watch", desc: "Agent polls the NEAR publisher contract for pending prediction requests every 30 seconds.", icon: <Clock className="w-4 h-4 text-blue-400" /> },
                  { step: 2, title: "Predict", desc: "Calls the ML API ensemble engine to generate a price prediction.", icon: <Activity className="w-4 h-4 text-emerald-400" /> },
                  { step: 3, title: "Prove", desc: "If ZK is required, generates a Groth16 proof hiding model weights.", icon: <ShieldCheck className="w-4 h-4 text-purple-400" /> },
                  { step: 4, title: "Fulfill", desc: "Submits prediction and proof to the NEAR publisher contract.", icon: <CheckCircle2 className="w-4 h-4 text-cyan-400" /> },
                ].map((item) => (
                  <div key={item.step} className="flex gap-4 p-4 rounded-xl bg-white/[0.02] border border-purple-500/5 hover:border-purple-500/12 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-purple-500/8 border border-purple-500/15 flex items-center justify-center flex-shrink-0">
                      {item.icon}
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">Step {item.step}: {item.title}</p>
                      <p className="text-gray-500 text-xs mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
