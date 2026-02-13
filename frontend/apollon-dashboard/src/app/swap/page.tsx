"use client";

import React from "react";
import Navbar from "@/components/Navbar";
import TokenSwap from "@/components/TokenSwap";
import IntentSwapPanel from "@/components/IntentSwapPanel";
import { ArrowLeftRight, Network, Timer, ShieldCheck, Waypoints, Flame } from "lucide-react";

export default function SwapPage() {
  return (
    <div className="min-h-screen text-white">
      <Navbar />

      <div className="container mx-auto px-6 py-10 max-w-7xl">
        {/* Page Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/15 flex items-center justify-center">
              <ArrowLeftRight className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Token Swap</h1>
              <p className="text-gray-500 text-sm">
                Cross-chain swaps powered by NEAR Intents + Aurora
              </p>
            </div>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
          {[
            { icon: <Network className="w-7 h-7 text-blue-400" />, title: "14+ Chains", desc: "Swap between NEAR, Aurora, Solana, Ethereum, Arbitrum, Base, and more." },
            { icon: <Flame className="w-7 h-7 text-emerald-400" />, title: "Aurora EVM", desc: "Native Aurora support — swap ERC-20 tokens on NEAR's EVM layer." },
            { icon: <Timer className="w-7 h-7 text-cyan-400" />, title: "Fast Settlement", desc: "Intent-based routing for quick cross-chain settlement." },
            { icon: <ShieldCheck className="w-7 h-7 text-purple-400" />, title: "Non-Custodial", desc: "Funds secured by smart contracts, not centralized bridges." },
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
          <div className="xl:col-span-2">
            <TokenSwap />
          </div>
          <div className="space-y-6">
            <IntentSwapPanel />
            <div className="pyth-card p-6">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2 text-sm">
                <Waypoints className="w-4 h-4 text-purple-400" />
                How It Works
              </h3>
              <div className="space-y-4">
                {[
                  { n: 1, title: "Select tokens", desc: "Choose source and destination chain and tokens" },
                  { n: 2, title: "Get quote", desc: "See the exchange rate and estimated time" },
                  { n: 3, title: "Deposit", desc: "Send tokens to the generated deposit address" },
                  { n: 4, title: "Receive", desc: "Tokens arrive on the destination chain" },
                ].map((step) => (
                  <div key={step.n} className="flex gap-3">
                    <div className="w-7 h-7 rounded-full bg-purple-500/8 border border-purple-500/15 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs text-purple-400 font-mono font-bold">{step.n}</span>
                    </div>
                    <div>
                      <p className="text-sm text-white font-medium">{step.title}</p>
                      <p className="text-xs text-gray-600">{step.desc}</p>
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
