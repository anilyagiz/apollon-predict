"use client";

import React from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import PredictionChart from "@/components/PredictionChart";
import RealTimePriceChart from "@/components/RealTimePriceChart";
import OneDayPredictions from "@/components/OneDayPredictions";
import PredictionGame from "@/components/PredictionGame";
import AgentStatus from "@/components/AgentStatus";
import {
  ArrowLeftRight,
  BrainCog,
  Fingerprint,
  BrainCircuit,
  Network,
  Timer,
  ArrowRight,
  Sparkles,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen text-white">
      <Navbar />

      <div className="container mx-auto px-6 py-10 max-w-7xl">
        {/* Hero Section */}
        <HeroSection />

        {/* Accent divider */}
        <div className="pyth-accent-line my-16 max-w-lg mx-auto" />

        {/* Stats Row - Pyth style */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={<BrainCircuit className="w-5 h-5 text-violet-400" />}
            value="4"
            label="ML Models"
            sub="LSTM, GRU, Prophet, XGBoost"
          />
          <StatCard
            icon={<Fingerprint className="w-5 h-5 text-purple-400" />}
            value="Groth16"
            label="ZK Privacy"
            sub="Model weights hidden"
          />
          <StatCard
            icon={<Network className="w-5 h-5 text-blue-400" />}
            value="14+"
            label="Blockchains"
            sub="Via NEAR Intents"
          />
          <StatCard
            icon={<Timer className="w-5 h-5 text-cyan-400" />}
            value="~350ms"
            label="Proof Time"
            sub="ZK proof generation"
          />
        </div>

        {/* Real-Time Price Chart */}
        <div className="mt-16">
          <RealTimePriceChart />
        </div>

        {/* 24-Hour Predictions Overview */}
        <div className="mt-16">
          <OneDayPredictions />
        </div>

        {/* Main Content Grid */}
        <div className="mt-16 grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Left Side - Info + Agent */}
          <div className="xl:col-span-1 space-y-6">
            {/* ZK Oracle Info */}
            <div className="pyth-card p-6">
              <div className="flex items-center gap-2 mb-6">
                <Sparkles className="w-5 h-5 text-purple-400" />
                <h2 className="text-lg font-bold text-white">ZK Price Oracle</h2>
              </div>

              <div className="space-y-6 text-gray-400">
                <div>
                  <h3 className="text-sm font-semibold text-purple-200 mb-2">
                    Zero-Knowledge Privacy
                  </h3>
                  <p className="text-sm leading-relaxed text-gray-500">
                    Model weights and individual predictions remain completely
                    private while proving correct ensemble calculations using
                    ZK-SNARKs.
                  </p>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-purple-200 mb-3">
                    ML Ensemble Models
                  </h3>
                  <div className="space-y-2.5">
                    <ModelBar name="LSTM" weight={35} color="bg-violet-500" />
                    <ModelBar name="GRU" weight={25} color="bg-purple-500" />
                    <ModelBar name="Prophet" weight={25} color="bg-blue-500" />
                    <ModelBar name="XGBoost" weight={15} color="bg-cyan-500" />
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-purple-200 mb-3">
                    Technical Features
                  </h3>
                  <ul className="space-y-2.5 text-sm">
                    {[
                      { color: "bg-violet-400", text: "Groth16 ZK-SNARK proofs" },
                      { color: "bg-purple-400", text: "Multi-source price aggregation" },
                      { color: "bg-blue-400", text: "Cross-chain via NEAR Intents" },
                      { color: "bg-emerald-400", text: "Multi-chain: NEAR, Aurora, ETH, SOL, ALGO" },
                      { color: "bg-cyan-400", text: "Shade Agent (TEE oracle)" },
                    ].map((item) => (
                      <li key={item.text} className="flex items-center gap-3 text-gray-400">
                        <div className={`w-1.5 h-1.5 rounded-full ${item.color} shrink-0`} />
                        {item.text}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Oracle Agent Status */}
            <AgentStatus />
          </div>

          {/* Right Side - Prediction Chart */}
          <div className="xl:col-span-2">
            <PredictionChart />
          </div>
        </div>

        {/* Gamified Prediction Section */}
        <div className="mt-16">
          <PredictionGame />
        </div>

        {/* Feature Navigation Cards */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            href="/swap"
            className="group pyth-card p-6 hover:border-blue-500/20 transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <ArrowLeftRight className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="text-lg font-bold text-white">Token Swap</h3>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-600 group-hover:text-purple-400 transition-colors" />
            </div>
            <p className="text-gray-500 text-sm leading-relaxed">
              Cross-chain token swaps across 14+ blockchains including ETH, SOL, ALGO, and Aurora
              powered by NEAR Intents. Pay for predictions from any chain.
            </p>
          </Link>

          <Link
            href="/agent"
            className="group pyth-card p-6 hover:border-purple-500/20 transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <BrainCog className="w-5 h-5 text-purple-400" />
                </div>
                <h3 className="text-lg font-bold text-white">Oracle Agent</h3>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-600 group-hover:text-purple-400 transition-colors" />
            </div>
            <p className="text-gray-500 text-sm leading-relaxed">
              Autonomous TEE-based oracle agent that fulfills predictions
              on-chain. View attestation, status, and fulfillment history.
            </p>
          </Link>
        </div>

        {/* Footer */}
        <div className="mt-20 pb-8 text-center">
          <div className="pyth-accent-line mb-8 max-w-xs mx-auto" />
          <p className="text-xs text-gray-600">
            Apollon Oracle v2.0 — Powered by NEAR, Aurora, ETH, SOL, ALGO &amp; ZK-SNARKs
          </p>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  value,
  label,
  sub,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  sub: string;
}) {
  return (
    <div className="pyth-card p-5">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <span className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold">
          {label}
        </span>
      </div>
      <p className="pyth-stat-number text-2xl">{value}</p>
      <p className="text-xs text-gray-600 mt-1">{sub}</p>
    </div>
  );
}

function ModelBar({
  name,
  weight,
  color,
}: {
  name: string;
  weight: number;
  color: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs">
        <span className="text-gray-400 font-medium">{name}</span>
        <span className="text-purple-200 font-semibold">{weight}%</span>
      </div>
      <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-700`}
          style={{ width: `${weight}%` }}
        />
      </div>
    </div>
  );
}
