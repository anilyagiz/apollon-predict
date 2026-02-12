"use client";

import React from "react";
import Navbar from "@/components/Navbar";
import TokenSwap from "@/components/TokenSwap";
import IntentSwapPanel from "@/components/IntentSwapPanel";
import { ArrowDownUp, Zap, Globe, Clock, Shield, Layers } from "lucide-react";

export default function SwapPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />

      <div className="container mx-auto px-6 py-10 max-w-7xl">
        {/* Page Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <ArrowDownUp className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Token Swap</h1>
              <p className="text-gray-400 text-sm">
                Cross-chain swaps powered by NEAR Intents
              </p>
            </div>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <div className="bg-neutral-900/50 border border-white/5 rounded-xl p-5">
            <Globe className="w-8 h-8 text-blue-400 mb-3" />
            <h3 className="text-white font-semibold mb-1">14+ Chains</h3>
            <p className="text-gray-500 text-sm">
              Swap between NEAR, Solana, Ethereum, Arbitrum, Base, Polygon, and
              many more blockchains.
            </p>
          </div>
          <div className="bg-neutral-900/50 border border-white/5 rounded-xl p-5">
            <Clock className="w-8 h-8 text-green-400 mb-3" />
            <h3 className="text-white font-semibold mb-1">Fast Settlement</h3>
            <p className="text-gray-500 text-sm">
              Intent-based architecture routes through the most efficient path
              for quick cross-chain settlement.
            </p>
          </div>
          <div className="bg-neutral-900/50 border border-white/5 rounded-xl p-5">
            <Shield className="w-8 h-8 text-purple-400 mb-3" />
            <h3 className="text-white font-semibold mb-1">Non-Custodial</h3>
            <p className="text-gray-500 text-sm">
              Powered by NEAR Intents -- your funds are secured by smart
              contracts, not centralized bridges.
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Token Swap - Primary */}
          <div className="xl:col-span-2">
            <TokenSwap />
          </div>

          {/* Sidebar - Prediction Payments */}
          <div className="space-y-6">
            <IntentSwapPanel />

            {/* How It Works */}
            <div className="bg-neutral-900/50 border border-white/5 rounded-xl p-6">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Layers className="w-4 h-4 text-gray-400" />
                How It Works
              </h3>
              <div className="space-y-4">
                <Step
                  number={1}
                  title="Select tokens"
                  desc="Choose source and destination chain and tokens"
                />
                <Step
                  number={2}
                  title="Get quote"
                  desc="See the exchange rate and estimated time"
                />
                <Step
                  number={3}
                  title="Deposit"
                  desc="Send tokens to the generated deposit address"
                />
                <Step
                  number={4}
                  title="Receive"
                  desc="Tokens arrive on the destination chain"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Step({
  number,
  title,
  desc,
}: {
  number: number;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0">
        <span className="text-xs text-gray-400 font-mono">{number}</span>
      </div>
      <div>
        <p className="text-sm text-white font-medium">{title}</p>
        <p className="text-xs text-gray-500">{desc}</p>
      </div>
    </div>
  );
}
