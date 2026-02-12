"use client";

import React from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import PredictionChart from "@/components/PredictionChart";
import RealTimePriceChart from "@/components/RealTimePriceChart";
import AgentStatus from "@/components/AgentStatus";
import {
  ArrowDownUp,
  Bot,
  Shield,
  Zap,
  BarChart3,
  Globe,
  ArrowRight,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      <div className="container mx-auto px-6 py-10 max-w-7xl">
        {/* Hero Section */}
        <HeroSection />

        {/* Quick Stats Row */}
        <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={<BarChart3 className="w-5 h-5 text-blue-400" />}
            label="ML Models"
            value="4 Ensemble"
            sub="LSTM, GRU, Prophet, XGBoost"
          />
          <StatCard
            icon={<Shield className="w-5 h-5 text-purple-400" />}
            label="ZK Privacy"
            value="Groth16"
            sub="Model weights hidden"
          />
          <StatCard
            icon={<Globe className="w-5 h-5 text-green-400" />}
            label="Chains"
            value="14+"
            sub="Via NEAR Intents"
          />
          <StatCard
            icon={<Zap className="w-5 h-5 text-yellow-400" />}
            label="Proof Time"
            value="~350ms"
            sub="ZK proof generation"
          />
        </div>

        {/* Real-Time Price Chart */}
        <div className="mt-12">
          <RealTimePriceChart />
        </div>

        {/* Main Content Grid */}
        <div className="mt-12 grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Left Side - Project Info + Agent Status */}
          <div className="xl:col-span-1 space-y-6">
            <div className="bg-neutral-900 rounded-xl p-6 border border-neutral-800">
              <h2 className="text-xl font-semibold text-white mb-6">
                ZK Price Oracle
              </h2>
              <div className="space-y-6 text-neutral-400">
                <div>
                  <h3 className="text-base font-medium text-white mb-2">
                    Zero-Knowledge Privacy
                  </h3>
                  <p className="text-sm leading-relaxed">
                    Model weights and individual predictions remain completely
                    private while proving correct ensemble calculations using
                    ZK-SNARKs.
                  </p>
                </div>

                <div>
                  <h3 className="text-base font-medium text-white mb-3">
                    ML Ensemble Models
                  </h3>
                  <div className="space-y-2 text-sm">
                    <ModelBar name="LSTM" weight={35} color="bg-blue-500" />
                    <ModelBar name="GRU" weight={25} color="bg-purple-500" />
                    <ModelBar name="Prophet" weight={25} color="bg-green-500" />
                    <ModelBar name="XGBoost" weight={15} color="bg-yellow-500" />
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-medium text-white mb-2">
                    Technical Features
                  </h3>
                  <ul className="text-sm space-y-2">
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                      Groth16 ZK-SNARK proofs
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                      Multi-source price aggregation
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-400" />
                      Cross-chain via NEAR Intents
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                      Shade Agent (TEE oracle)
                    </li>
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

        {/* Feature Navigation Cards */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            href="/swap"
            className="group bg-neutral-900/50 border border-white/5 rounded-xl p-6 hover:border-blue-500/30 hover:bg-blue-500/5 transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <ArrowDownUp className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">
                  Token Swap
                </h3>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-600 group-hover:text-blue-400 transition-colors" />
            </div>
            <p className="text-gray-400 text-sm">
              Cross-chain token swaps across 14+ blockchains powered by NEAR
              Intents. Pay for predictions from any chain.
            </p>
          </Link>

          <Link
            href="/agent"
            className="group bg-neutral-900/50 border border-white/5 rounded-xl p-6 hover:border-purple-500/30 hover:bg-purple-500/5 transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-purple-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">
                  Oracle Agent
                </h3>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-600 group-hover:text-purple-400 transition-colors" />
            </div>
            <p className="text-gray-400 text-sm">
              Autonomous TEE-based oracle agent that fulfills predictions
              on-chain. View attestation, status, and fulfillment history.
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="bg-neutral-900/50 border border-white/5 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs text-gray-500 uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="text-xl font-bold text-white">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{sub}</p>
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
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span>{name}</span>
        <span className="text-white">{weight}%</span>
      </div>
      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all`}
          style={{ width: `${weight}%` }}
        />
      </div>
    </div>
  );
}
