"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  BrainCircuit,
  RefreshCw,
  ChevronRight,
  ShieldCheck,
  Clock,
} from "lucide-react";
import { TokenLogo } from "@/components/TokenLogos";

/* ======================================================================== */
/*  Token definitions                                                       */
/* ======================================================================== */

interface TokenDef {
  id: string;
  label: string;
  symbol: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ReactNode;
  decimals: number;
}

const TOKENS: TokenDef[] = [
  {
    id: "near",
    label: "NEAR",
    symbol: "NEARUSD",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/15",
    icon: <TokenLogo tokenId="near" size={20} />,
    decimals: 4,
  },
  {
    id: "aurora",
    label: "Aurora",
    symbol: "AURORAUSD",
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/15",
    icon: <TokenLogo tokenId="aurora" size={20} />,
    decimals: 4,
  },
  {
    id: "ethereum",
    label: "ETH",
    symbol: "ETHUSD",
    color: "text-indigo-400",
    bgColor: "bg-indigo-500/10",
    borderColor: "border-indigo-500/15",
    icon: <TokenLogo tokenId="ethereum" size={20} />,
    decimals: 2,
  },
  {
    id: "solana",
    label: "SOL",
    symbol: "SOLUSD",
    color: "text-violet-400",
    bgColor: "bg-violet-500/10",
    borderColor: "border-violet-500/15",
    icon: <TokenLogo tokenId="solana" size={20} />,
    decimals: 2,
  },
  {
    id: "algorand",
    label: "ALGO",
    symbol: "ALGOUSD",
    color: "text-teal-400",
    bgColor: "bg-teal-500/10",
    borderColor: "border-teal-500/15",
    icon: <TokenLogo tokenId="algorand" size={20} />,
    decimals: 4,
  },
];

/* ======================================================================== */
/*  Types                                                                   */
/* ======================================================================== */

interface PredictionResult {
  symbol: string;
  current_price: number;
  predicted_price: number;
  price_change: number;
  price_change_percent: number;
  confidence: number;
  confidence_interval: { lower: number; upper: number };
  individual_predictions: Record<string, number>;
  model_weights: Record<string, number>;
}

/* ======================================================================== */
/*  Component                                                               */
/* ======================================================================== */

export default function OneDayPredictions() {
  const [predictions, setPredictions] = useState<Record<string, PredictionResult>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [expandedToken, setExpandedToken] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const fetchAllPredictions = async () => {
    setIsLoading(true);
    const results: Record<string, PredictionResult> = {};

    // Fetch predictions for all tokens in parallel
    const promises = TOKENS.map(async (token) => {
      try {
        const resp = await fetch(`${apiUrl}/predict`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symbol: token.symbol, timeframe: "24h" }),
        });
        if (resp.ok) {
          const data = await resp.json();
          results[token.id] = data;
        }
      } catch (err) {
        console.error(`Prediction failed for ${token.label}:`, err);
      }
    });

    await Promise.allSettled(promises);
    setPredictions(results);
    setLastUpdated(new Date().toLocaleTimeString());
    setIsLoading(false);
  };

  useEffect(() => {
    fetchAllPredictions();
  }, []);

  const formatPrice = (value: number, decimals: number) =>
    `$${value.toFixed(decimals)}`;

  return (
    <div className="pyth-card-elevated p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center">
              <BrainCircuit className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">
                24-Hour Predictions
              </h2>
              <p className="text-gray-500 text-sm mt-0.5">
                ML ensemble forecasts for all supported tokens
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-[11px] text-gray-600 flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              Updated {lastUpdated}
            </span>
          )}
          <button
            onClick={fetchAllPredictions}
            disabled={isLoading}
            className="pyth-btn-primary px-4 py-2 flex items-center gap-2 text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            {isLoading ? "Loading..." : "Refresh All"}
          </button>
        </div>
      </div>

      {/* Predictions Grid */}
      <div className="space-y-3">
        {TOKENS.map((token) => {
          const pred = predictions[token.id];
          const isExpanded = expandedToken === token.id;
          const isUp = pred ? pred.price_change >= 0 : true;

          return (
            <motion.div
              key={token.id}
              layout
              className={`rounded-xl border transition-all ${
                pred
                  ? `${token.borderColor} hover:border-purple-500/20`
                  : "border-white/5"
              } bg-white/[0.015]`}
            >
              {/* Main Row */}
              <button
                onClick={() => setExpandedToken(isExpanded ? null : token.id)}
                className="w-full p-4 flex items-center gap-4 text-left"
              >
                {/* Token Icon */}
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${token.bgColor}`}
                >
                  {token.icon}
                </div>

                {/* Token Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-semibold text-sm">
                      {token.label}
                    </span>
                    <span className="text-gray-600 text-xs font-mono">
                      {token.symbol}
                    </span>
                  </div>
                  <div className="text-gray-500 text-xs mt-0.5">
                    Current:{" "}
                    <span className="text-gray-300 font-mono">
                      {pred
                        ? formatPrice(pred.current_price, token.decimals)
                        : "--"}
                    </span>
                  </div>
                </div>

                {/* Predicted Price */}
                <div className="text-right shrink-0">
                  {pred ? (
                    <>
                      <div className="pyth-stat-number text-lg font-mono">
                        {formatPrice(pred.predicted_price, token.decimals)}
                      </div>
                      <div
                        className={`flex items-center justify-end gap-1 text-xs font-semibold ${
                          isUp ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {isUp ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        {isUp ? "+" : ""}
                        {pred.price_change_percent.toFixed(2)}%
                      </div>
                    </>
                  ) : (
                    <div className="text-gray-600 text-sm">
                      {isLoading ? (
                        <div className="w-4 h-4 border-2 border-purple-500/30 border-t-purple-400 rounded-full animate-spin" />
                      ) : (
                        "--"
                      )}
                    </div>
                  )}
                </div>

                {/* Confidence */}
                <div className="text-right shrink-0 hidden md:block w-20">
                  {pred ? (
                    <>
                      <div className="text-xs text-gray-500 mb-1">Confidence</div>
                      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all"
                          style={{
                            width: `${Math.min(pred.confidence * 100, 100)}%`,
                          }}
                        />
                      </div>
                      <div className="text-[10px] text-purple-300 mt-0.5 font-semibold">
                        {(pred.confidence * 100).toFixed(1)}%
                      </div>
                    </>
                  ) : null}
                </div>

                {/* Expand Arrow */}
                <ChevronRight
                  className={`w-4 h-4 text-gray-600 shrink-0 transition-transform ${
                    isExpanded ? "rotate-90" : ""
                  }`}
                />
              </button>

              {/* Expanded Details */}
              <AnimatePresence>
                {isExpanded && pred && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 pt-1 border-t border-white/5">
                      {/* Confidence Interval */}
                      <div className="flex items-center gap-2 mb-4 mt-3">
                        <ShieldCheck className="w-4 h-4 text-purple-400" />
                        <span className="text-xs text-gray-400">
                          Confidence interval:{" "}
                          <span className="text-purple-200 font-mono">
                            {formatPrice(
                              pred.confidence_interval.lower,
                              token.decimals
                            )}
                          </span>
                          {" — "}
                          <span className="text-purple-200 font-mono">
                            {formatPrice(
                              pred.confidence_interval.upper,
                              token.decimals
                            )}
                          </span>
                        </span>
                      </div>

                      {/* Individual Model Predictions */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {Object.entries(pred.individual_predictions).map(
                          ([model, price]) => {
                            const weight =
                              pred.model_weights[
                                model as keyof typeof pred.model_weights
                              ];
                            const modelColors: Record<string, string> = {
                              lstm: "border-violet-500/15 text-violet-300",
                              gru: "border-purple-500/15 text-purple-300",
                              prophet: "border-blue-500/15 text-blue-300",
                              xgboost: "border-cyan-500/15 text-cyan-300",
                            };
                            return (
                              <div
                                key={model}
                                className={`rounded-lg border p-2.5 bg-white/[0.02] ${
                                  modelColors[model] || "border-white/5 text-gray-300"
                                }`}
                              >
                                <div className="text-[10px] font-bold uppercase tracking-wider">
                                  {model}
                                </div>
                                <div className="text-sm font-bold text-white mt-1 font-mono">
                                  {formatPrice(price, token.decimals)}
                                </div>
                                <div className="text-[10px] text-gray-600">
                                  {weight
                                    ? `${(weight * 100).toFixed(0)}% weight`
                                    : ""}
                                </div>
                              </div>
                            );
                          }
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
