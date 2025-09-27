"use client";

import React from "react";
import { motion } from "framer-motion";
import HeroSection from "@/components/HeroSection";
import PredictionChart from "@/components/PredictionChart";
import RealTimePriceChart from "@/components/RealTimePriceChart";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <HeroSection />
        </motion.div>

        {/* Real-Time Price Chart - Full Width */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mt-12"
        >
          <RealTimePriceChart />
        </motion.div>

        {/* Main Content Grid */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-8 grid grid-cols-1 xl:grid-cols-3 gap-8"
        >
          {/* Left Side - Project Info */}
          <div className="xl:col-span-1">
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10"
            >
              <h2 className="text-2xl font-bold text-white mb-4">
                ZK Price Oracle
              </h2>
              <div className="space-y-4 text-gray-300">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Zero-Knowledge Privacy
                  </h3>
                  <p className="text-sm">
                    Model weights and individual predictions remain completely
                    private while proving correct ensemble calculations using
                    ZK-SNARKs.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    ML Ensemble Models
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-blue-500/20 rounded-lg p-2">
                      <div className="font-medium">LSTM</div>
                      <div className="text-blue-300">35% weight</div>
                    </div>
                    <div className="bg-green-500/20 rounded-lg p-2">
                      <div className="font-medium">GRU</div>
                      <div className="text-green-300">25% weight</div>
                    </div>
                    <div className="bg-yellow-500/20 rounded-lg p-2">
                      <div className="font-medium">Prophet</div>
                      <div className="text-yellow-300">25% weight</div>
                    </div>
                    <div className="bg-purple-500/20 rounded-lg p-2">
                      <div className="font-medium">XGBoost</div>
                      <div className="text-purple-300">15% weight</div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    Technical Features
                  </h3>
                  <ul className="text-sm space-y-1">
                    <li>• Groth16 ZK-SNARK proofs</li>
                    <li>• Multi-source price aggregation</li>
                    <li>• Real-time model training</li>
                    <li>• Privacy-preserving predictions</li>
                  </ul>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Right Side - Prediction Chart */}
          <div className="xl:col-span-2">
            <PredictionChart />
          </div>
        </motion.div>
      </div>
    </div>
  );
}
