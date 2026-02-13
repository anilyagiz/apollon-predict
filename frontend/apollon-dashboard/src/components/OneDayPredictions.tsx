"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  YAxis,
} from "recharts";
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
  /** Symbol sent to the /predict API (e.g. "NEARUSD") */
  symbol: string;
  color: string;
  bgColor: string;
  borderColor: string;
  decimals: number;
}

const TOKENS: TokenDef[] = [
  { id: "near", label: "NEAR", symbol: "NEARUSD", color: "#3B82F6", bgColor: "bg-blue-500/10", borderColor: "border-blue-500/15", decimals: 4 },
  { id: "aurora", label: "Aurora", symbol: "AURORAUSD", color: "#10B981", bgColor: "bg-emerald-500/10", borderColor: "border-emerald-500/15", decimals: 4 },
  { id: "ethereum", label: "ETH", symbol: "ETHUSD", color: "#818CF8", bgColor: "bg-indigo-500/10", borderColor: "border-indigo-500/15", decimals: 2 },
  { id: "solana", label: "SOL", symbol: "SOLUSD", color: "#A78BFA", bgColor: "bg-violet-500/10", borderColor: "border-violet-500/15", decimals: 2 },
  { id: "algorand", label: "ALGO", symbol: "ALGOUSD", color: "#2DD4BF", bgColor: "bg-teal-500/10", borderColor: "border-teal-500/15", decimals: 4 },
];

/* ======================================================================== */
/*  Types  (same shape as PredictionChart)                                  */
/* ======================================================================== */

interface PredictionResult {
  symbol: string;
  timeframe: string;
  current_price: number;
  predicted_price: number;
  price_change: number;
  price_change_percent: number;
  confidence: number;
  confidence_interval: { lower: number; upper: number };
  individual_predictions: Record<string, number>;
  model_weights: Record<string, number>;
}

/** Interpolated chart data — same algorithm as PredictionChart */
interface ChartPoint {
  hour: number;
  price: number;
  lower: number;
  upper: number;
}

const TIMEFRAME = "24h"; // locked to 24 hours
const INTERP_STEPS = 12; // 12 points → every 2 hours

/** Build an interpolated 24-hour sparkline from now → predicted. */
function buildChartData(pred: PredictionResult): ChartPoint[] {
  const pts: ChartPoint[] = [];
  for (let i = 0; i <= INTERP_STEPS; i++) {
    const t = i / INTERP_STEPS; // 0 → 1
    // ease-in-out cubic for a natural curve
    const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    pts.push({
      hour: Math.round(t * 24),
      price: pred.current_price + (pred.predicted_price - pred.current_price) * ease,
      lower: pred.current_price + (pred.confidence_interval.lower - pred.current_price) * ease,
      upper: pred.current_price + (pred.confidence_interval.upper - pred.current_price) * ease,
    });
  }
  return pts;
}

/* ======================================================================== */
/*  Component                                                               */
/* ======================================================================== */

export default function OneDayPredictions() {
  const [predictions, setPredictions] = useState<Record<string, PredictionResult>>({});
  const [chartDataMap, setChartDataMap] = useState<Record<string, ChartPoint[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [expandedToken, setExpandedToken] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const fetchAllPredictions = async () => {
    setIsLoading(true);
    const results: Record<string, PredictionResult> = {};
    const charts: Record<string, ChartPoint[]> = {};

    // Fetch all 5 token predictions in parallel — same endpoint & algorithm
    // as PredictionChart, timeframe locked to 24h
    const promises = TOKENS.map(async (token) => {
      try {
        const resp = await fetch(`${apiUrl}/predict`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symbol: token.symbol, timeframe: TIMEFRAME }),
        });
        if (resp.ok) {
          const data: PredictionResult = await resp.json();
          results[token.id] = data;
          charts[token.id] = buildChartData(data);
        }
      } catch (err) {
        console.error(`Prediction failed for ${token.label}:`, err);
      }
    });

    await Promise.allSettled(promises);
    setPredictions(results);
    setChartDataMap(charts);
    setLastUpdated(new Date().toLocaleTimeString());
    setIsLoading(false);
  };

  useEffect(() => {
    fetchAllPredictions();
  }, [fetchAllPredictions]);

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
                ML ensemble 24 h forecasts — same algorithm, all tokens in
                parallel
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
            <RefreshCw
              className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
            />
            {isLoading ? "Loading..." : "Refresh All"}
          </button>
        </div>
      </div>

      {/* Predictions List */}
      <div className="space-y-3">
        {TOKENS.map((token) => {
          const pred = predictions[token.id];
          const chart = chartDataMap[token.id];
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
                onClick={() =>
                  setExpandedToken(isExpanded ? null : token.id)
                }
                className="w-full p-4 flex items-center gap-4 text-left"
              >
                {/* Token Icon */}
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${token.bgColor}`}
                >
                  <TokenLogo tokenId={token.id} size={20} />
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
                    <span className="text-[9px] text-gray-600 border border-white/5 rounded px-1.5 py-0.5 font-medium">
                      24H
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

                {/* Mini sparkline chart */}
                <div className="w-24 h-10 shrink-0 hidden sm:block">
                  {chart && chart.length > 1 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chart}>
                        <YAxis hide domain={["dataMin", "dataMax"]} />
                        <Line
                          type="monotone"
                          dataKey="price"
                          stroke={isUp ? "#10B981" : "#EF4444"}
                          strokeWidth={1.5}
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="upper"
                          stroke={token.color}
                          strokeWidth={0.5}
                          strokeDasharray="3 3"
                          dot={false}
                          opacity={0.3}
                        />
                        <Line
                          type="monotone"
                          dataKey="lower"
                          stroke={token.color}
                          strokeWidth={0.5}
                          strokeDasharray="3 3"
                          dot={false}
                          opacity={0.3}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : isLoading ? (
                    <div className="h-full flex items-center justify-center">
                      <div className="w-3 h-3 border-2 border-purple-500/30 border-t-purple-400 rounded-full animate-spin" />
                    </div>
                  ) : null}
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
                      <div className="text-xs text-gray-500 mb-1">
                        Confidence
                      </div>
                      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all"
                          style={{
                            width: `${Math.min(
                              pred.confidence * 100,
                              100
                            )}%`,
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
                {isExpanded && pred && chart && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 pt-1 border-t border-white/5">
                      {/* Expanded chart — same data, bigger */}
                      <div className="h-32 w-full mb-4 mt-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={chart}
                            margin={{ top: 4, right: 4, left: 4, bottom: 4 }}
                          >
                            <YAxis
                              hide
                              domain={["dataMin - 0.0001", "dataMax + 0.0001"]}
                            />
                            <Line
                              type="monotone"
                              dataKey="upper"
                              stroke="#EF4444"
                              strokeWidth={1}
                              strokeDasharray="4 4"
                              dot={false}
                            />
                            <Line
                              type="monotone"
                              dataKey="lower"
                              stroke="#EF4444"
                              strokeWidth={1}
                              strokeDasharray="4 4"
                              dot={false}
                            />
                            <Line
                              type="monotone"
                              dataKey="price"
                              stroke={token.color}
                              strokeWidth={2}
                              dot={false}
                              activeDot={{
                                r: 3,
                                stroke: token.color,
                                fill: "#1A0F2E",
                              }}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                        <div className="flex justify-between text-[9px] text-gray-600 -mt-1 px-1">
                          <span>Now</span>
                          <span>+6 h</span>
                          <span>+12 h</span>
                          <span>+18 h</span>
                          <span>+24 h</span>
                        </div>
                      </div>

                      {/* Confidence Interval */}
                      <div className="flex items-center gap-2 mb-4">
                        <ShieldCheck className="w-4 h-4 text-purple-400" />
                        <span className="text-xs text-gray-400">
                          24 h confidence interval:{" "}
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
                                  modelColors[model] ||
                                  "border-white/5 text-gray-300"
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

      {/* Footer */}
      <div className="flex items-center justify-between text-[11px] text-gray-600 mt-4 pt-4 border-t border-purple-500/5">
        <div>
          Timeframe: 24 h &middot; Same ML ensemble algorithm as Prediction
          Chart
        </div>
        <div>
          {Object.keys(predictions).length}/{TOKENS.length} tokens loaded
        </div>
      </div>
    </div>
  );
}
