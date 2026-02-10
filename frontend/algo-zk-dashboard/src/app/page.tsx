"use client";

import React from "react";
import HeroSection from "@/components/HeroSection";
import PredictionChart from "@/components/PredictionChart";
import RealTimePriceChart from "@/components/RealTimePriceChart";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-6 py-12 max-w-7xl">
        {/* Hero Section */}
        <HeroSection />

        {/* Real-Time Price Chart */}
        <div className="mt-16">
          <RealTimePriceChart />
        </div>

        {/* Main Content Grid */}
        <div className="mt-12 grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Left Side - Project Info */}
          <div className="xl:col-span-1">
            <div className="bg-neutral-900 rounded-lg p-6 border border-neutral-800">
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
                    <div className="flex justify-between py-2 border-b border-neutral-800">
                      <span>LSTM</span>
                      <span className="text-white">35%</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-neutral-800">
                      <span>GRU</span>
                      <span className="text-white">25%</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-neutral-800">
                      <span>Prophet</span>
                      <span className="text-white">25%</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span>XGBoost</span>
                      <span className="text-white">15%</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-medium text-white mb-2">
                    Technical Features
                  </h3>
                  <ul className="text-sm space-y-2">
                    <li>Groth16 ZK-SNARK proofs</li>
                    <li>Multi-source price aggregation</li>
                    <li>Real-time model training</li>
                    <li>Privacy-preserving predictions</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Prediction Chart */}
          <div className="xl:col-span-2">
            <PredictionChart />
          </div>
        </div>
      </div>
    </div>
  );
}
