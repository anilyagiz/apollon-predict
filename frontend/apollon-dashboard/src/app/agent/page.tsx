"use client";

import React, { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import AgentStatus from "@/components/AgentStatus";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Bot,
  Shield,
  Activity,
  Cpu,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Server,
  Lock,
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
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      <div className="container mx-auto px-6 py-10 max-w-7xl">
        {/* Page Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Bot className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Oracle Agent</h1>
              <p className="text-gray-400 text-sm">
                Autonomous TEE-based multichain price oracle powered by Shade
                Protocol
              </p>
            </div>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
          <div className="bg-neutral-900/50 border border-white/5 rounded-xl p-5">
            <Cpu className="w-8 h-8 text-purple-400 mb-3" />
            <h3 className="text-white font-semibold mb-1">TEE Secured</h3>
            <p className="text-gray-500 text-sm">
              Runs inside a Trusted Execution Environment for verifiable
              computation.
            </p>
          </div>
          <div className="bg-neutral-900/50 border border-white/5 rounded-xl p-5">
            <Activity className="w-8 h-8 text-blue-400 mb-3" />
            <h3 className="text-white font-semibold mb-1">Autonomous</h3>
            <p className="text-gray-500 text-sm">
              Watches for prediction requests and fulfills them automatically
              on-chain.
            </p>
          </div>
          <div className="bg-neutral-900/50 border border-white/5 rounded-xl p-5">
            <Shield className="w-8 h-8 text-green-400 mb-3" />
            <h3 className="text-white font-semibold mb-1">Restricted</h3>
            <p className="text-gray-500 text-sm">
              Agent contract limits actions to approved methods only -- no
              unauthorized access.
            </p>
          </div>
          <div className="bg-neutral-900/50 border border-white/5 rounded-xl p-5">
            <Server className="w-8 h-8 text-yellow-400 mb-3" />
            <h3 className="text-white font-semibold mb-1">Multichain</h3>
            <p className="text-gray-500 text-sm">
              Publishes prices to NEAR and Solana (planned) via Chain
              Signatures.
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Left Column - Agent Status */}
          <div className="xl:col-span-1 space-y-6">
            <AgentStatus />

            {/* Agent Architecture */}
            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
                  <Lock className="w-5 h-5 text-gray-400" />
                  Agent Architecture
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
                    <div className="w-2 h-2 rounded-full bg-purple-400 mt-1.5 flex-shrink-0" />
                    <div>
                      <p className="text-white font-medium">Shade Agent</p>
                      <p className="text-gray-500 text-xs">
                        Hono server running in TEE, executes prediction
                        fulfillment cycles
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
                    <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                    <div>
                      <p className="text-white font-medium">Agent Contract</p>
                      <p className="text-gray-500 text-xs">
                        NEAR smart contract that restricts agent to approved
                        actions only
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
                    <div className="w-2 h-2 rounded-full bg-green-400 mt-1.5 flex-shrink-0" />
                    <div>
                      <p className="text-white font-medium">ML Engine</p>
                      <p className="text-gray-500 text-xs">
                        Ensemble of LSTM, GRU, Prophet, and XGBoost models for
                        predictions
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-white/5">
                    <div className="w-2 h-2 rounded-full bg-yellow-400 mt-1.5 flex-shrink-0" />
                    <div>
                      <p className="text-white font-medium">ZK Prover</p>
                      <p className="text-gray-500 text-xs">
                        Generates Groth16 proofs to hide model weights while
                        proving correctness
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - TEE Attestation + Cycle Log */}
          <div className="xl:col-span-2 space-y-6">
            {/* TEE Attestation */}
            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-purple-400" />
                  TEE Attestation
                  {attestation?.available ? (
                    <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                      Verified
                    </Badge>
                  ) : (
                    <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30">
                      Development
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingAttestation ? (
                  <div className="flex items-center gap-2 text-gray-400">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Loading attestation data...
                  </div>
                ) : attestation ? (
                  <div className="space-y-3">
                    <InfoRow
                      label="TEE Type"
                      value={attestation.tee_type || "N/A"}
                    />
                    <InfoRow
                      label="Agent Account"
                      value={attestation.agent_account || "Not registered"}
                      mono
                    />
                    <InfoRow
                      label="Code Hash"
                      value={attestation.code_hash || "N/A"}
                      mono
                    />
                    <InfoRow
                      label="Status"
                      value={attestation.message}
                    />
                    {attestation.attestation_quote && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">
                          Attestation Quote
                        </p>
                        <pre className="text-xs text-gray-300 bg-black/30 rounded-lg p-3 overflow-x-auto">
                          {attestation.attestation_quote}
                        </pre>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-gray-500">
                    <AlertCircle className="w-4 h-4" />
                    Could not load attestation data
                  </div>
                )}
              </CardContent>
            </Card>

            {/* How It Works */}
            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-blue-400" />
                  Prediction Fulfillment Cycle
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <CycleStep
                    step={1}
                    title="Watch"
                    desc="Agent polls the NEAR publisher contract for pending prediction requests every 30 seconds."
                    icon={<Clock className="w-4 h-4 text-blue-400" />}
                  />
                  <CycleStep
                    step={2}
                    title="Predict"
                    desc="Calls the ML API ensemble engine (LSTM + GRU + Prophet + XGBoost) to generate a price prediction."
                    icon={<Activity className="w-4 h-4 text-green-400" />}
                  />
                  <CycleStep
                    step={3}
                    title="Prove"
                    desc="If ZK is required, generates a Groth16 proof that hides model weights while proving correct computation."
                    icon={<Shield className="w-4 h-4 text-purple-400" />}
                  />
                  <CycleStep
                    step={4}
                    title="Fulfill"
                    desc="Submits the prediction and proof to the NEAR publisher contract, earning the deposited reward."
                    icon={<CheckCircle2 className="w-4 h-4 text-yellow-400" />}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between items-start gap-4 py-2 border-b border-white/5 last:border-0">
      <span className="text-sm text-gray-400 flex-shrink-0">{label}</span>
      <span
        className={`text-sm text-white text-right ${mono ? "font-mono" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

function CycleStep({
  step,
  title,
  desc,
  icon,
}: {
  step: number;
  title: string;
  desc: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex gap-4 p-4 rounded-lg bg-white/5 hover:bg-white/[0.07] transition-colors">
      <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-white font-medium text-sm">
          Step {step}: {title}
        </p>
        <p className="text-gray-500 text-sm mt-0.5">{desc}</p>
      </div>
    </div>
  );
}
