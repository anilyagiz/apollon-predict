"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy,
  TrendingUp,
  TrendingDown,
  Zap,
  Target,
  Flame as FireIcon,
  ArrowUp,
  ArrowDown,
  Clock,
  CheckCircle2,
  XCircle,
  Star,
  Medal,
  BarChart3,
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
  bgClass: string;
  icon: React.ReactNode;
  decimals: number;
}

const TOKENS: TokenDef[] = [
  { id: "near", label: "NEAR", symbol: "NEAR", color: "#3B82F6", bgClass: "bg-blue-500/10", icon: <TokenLogo tokenId="near" size={16} />, decimals: 4 },
  { id: "aurora", label: "Aurora", symbol: "AURORA", color: "#10B981", bgClass: "bg-emerald-500/10", icon: <TokenLogo tokenId="aurora" size={16} />, decimals: 4 },
  { id: "ethereum", label: "ETH", symbol: "ETH", color: "#818CF8", bgClass: "bg-indigo-500/10", icon: <TokenLogo tokenId="ethereum" size={16} />, decimals: 2 },
  { id: "solana", label: "SOL", symbol: "SOL", color: "#A78BFA", bgClass: "bg-violet-500/10", icon: <TokenLogo tokenId="solana" size={16} />, decimals: 2 },
  { id: "algorand", label: "ALGO", symbol: "ALGO", color: "#2DD4BF", bgClass: "bg-teal-500/10", icon: <TokenLogo tokenId="algorand" size={16} />, decimals: 4 },
];

/* ======================================================================== */
/*  Types                                                                   */
/* ======================================================================== */

interface UserPrediction {
  id: string;
  tokenId: string;
  direction: "up" | "down";
  targetPercent: number;
  entryPrice: number;
  timestamp: number;
  expiresAt: number;
  resolved: boolean;
  won?: boolean;
  exitPrice?: number;
  pointsEarned?: number;
}

interface UserStats {
  totalPredictions: number;
  wins: number;
  losses: number;
  currentStreak: number;
  bestStreak: number;
  totalPoints: number;
  level: number;
  xpToNextLevel: number;
  currentXp: number;
}

const TIMEFRAMES = [
  { label: "1 Hour", value: 60 * 60 * 1000 },
  { label: "4 Hours", value: 4 * 60 * 60 * 1000 },
  { label: "24 Hours", value: 24 * 60 * 60 * 1000 },
];

const LEVEL_NAMES = [
  "Novice Trader",
  "Chart Watcher",
  "Market Reader",
  "Trend Spotter",
  "Oracle Apprentice",
  "Price Prophet",
  "Market Sage",
  "ZK Seer",
  "Apollon Oracle",
  "Legendary Predictor",
];

const XP_PER_LEVEL = 200;

/* ======================================================================== */
/*  Helpers                                                                 */
/* ======================================================================== */

function getStoredPredictions(): UserPrediction[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem("apollon_predictions") || "[]");
  } catch {
    return [];
  }
}

function storePredictions(preds: UserPrediction[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem("apollon_predictions", JSON.stringify(preds));
}

function getStoredStats(): UserStats {
  if (typeof window === "undefined")
    return {
      totalPredictions: 0,
      wins: 0,
      losses: 0,
      currentStreak: 0,
      bestStreak: 0,
      totalPoints: 0,
      level: 0,
      xpToNextLevel: XP_PER_LEVEL,
      currentXp: 0,
    };
  try {
    const raw = localStorage.getItem("apollon_stats");
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return {
    totalPredictions: 0,
    wins: 0,
    losses: 0,
    currentStreak: 0,
    bestStreak: 0,
    totalPoints: 0,
    level: 0,
    xpToNextLevel: XP_PER_LEVEL,
    currentXp: 0,
  };
}

function storeStats(stats: UserStats) {
  if (typeof window === "undefined") return;
  localStorage.setItem("apollon_stats", JSON.stringify(stats));
}

/* ======================================================================== */
/*  Component                                                               */
/* ======================================================================== */

export default function PredictionGame() {
  /* ---- State ---- */
  const [selectedToken, setSelectedToken] = useState<TokenDef>(TOKENS[0]);
  const [direction, setDirection] = useState<"up" | "down">("up");
  const [targetPercent, setTargetPercent] = useState(2);
  const [timeframe, setTimeframe] = useState(TIMEFRAMES[1].value);
  const [currentPrices, setCurrentPrices] = useState<Record<string, number>>({});
  const [predictions, setPredictions] = useState<UserPrediction[]>([]);
  const [stats, setStats] = useState<UserStats>(getStoredStats());
  const [showHistory, setShowHistory] = useState(false);
  const [justWon, setJustWon] = useState(false);
  const [justLost, setJustLost] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  /* ---- Fetch prices ---- */
  const fetchPrices = useCallback(async () => {
    try {
      const resp = await fetch(`${apiUrl}/price/tokens`);
      if (resp.ok) {
        const data = await resp.json();
        if (data?.tokens) {
          const prices: Record<string, number> = {};
          for (const [key, val] of Object.entries(data.tokens)) {
            prices[key] = (val as { usd: number }).usd;
          }
          setCurrentPrices(prices);
        }
      }
    } catch (err) {
      console.error("Failed to fetch prices:", err);
    }
  }, [apiUrl]);

  /* ---- Load stored data ---- */
  useEffect(() => {
    setPredictions(getStoredPredictions());
    setStats(getStoredStats());
    fetchPrices();
    const interval = setInterval(fetchPrices, 15000);
    return () => clearInterval(interval);
  }, [fetchPrices]);

  /* ---- Resolve expired predictions ---- */
  useEffect(() => {
    const now = Date.now();
    let changed = false;
    const updated = predictions.map((p) => {
      if (p.resolved) return p;
      if (now < p.expiresAt) return p;

      // Time to resolve
      changed = true;
      const currentPrice = currentPrices[p.tokenId] || p.entryPrice;
      const actualChange = ((currentPrice - p.entryPrice) / p.entryPrice) * 100;
      const won =
        p.direction === "up"
          ? actualChange >= p.targetPercent * 0.5 // Generous: half the target counts
          : actualChange <= -p.targetPercent * 0.5;

      const basePoints = won ? 50 : 5; // Participation points even for losses
      const bonusPoints = won ? Math.round(p.targetPercent * 10) : 0;
      const points = basePoints + bonusPoints;

      return {
        ...p,
        resolved: true,
        won,
        exitPrice: currentPrice,
        pointsEarned: points,
      };
    });

    if (changed) {
      setPredictions(updated);
      storePredictions(updated);

      // Update stats
      const newResolved = updated.filter(
        (p) =>
          p.resolved &&
          !predictions.find((op) => op.id === p.id && op.resolved)
      );

      if (newResolved.length > 0) {
        setStats((prev) => {
          const newStats = { ...prev };
          for (const r of newResolved) {
            newStats.totalPredictions++;
            if (r.won) {
              newStats.wins++;
              newStats.currentStreak++;
              newStats.bestStreak = Math.max(
                newStats.bestStreak,
                newStats.currentStreak
              );
              setJustWon(true);
              setTimeout(() => setJustWon(false), 3000);
            } else {
              newStats.losses++;
              newStats.currentStreak = 0;
              setJustLost(true);
              setTimeout(() => setJustLost(false), 2000);
            }
            newStats.totalPoints += r.pointsEarned || 0;
            newStats.currentXp += r.pointsEarned || 0;

            // Level up
            while (newStats.currentXp >= newStats.xpToNextLevel) {
              newStats.currentXp -= newStats.xpToNextLevel;
              newStats.level = Math.min(newStats.level + 1, LEVEL_NAMES.length - 1);
              newStats.xpToNextLevel = XP_PER_LEVEL * (newStats.level + 1);
            }
          }
          storeStats(newStats);
          return newStats;
        });
      }
    }
  }, [predictions, currentPrices]);

  /* ---- Submit prediction ---- */
  const handlePredict = () => {
    const price = currentPrices[selectedToken.id];
    if (!price) return;

    const newPred: UserPrediction = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      tokenId: selectedToken.id,
      direction,
      targetPercent,
      entryPrice: price,
      timestamp: Date.now(),
      expiresAt: Date.now() + timeframe,
      resolved: false,
    };

    const updated = [newPred, ...predictions];
    setPredictions(updated);
    storePredictions(updated);
  };

  /* ---- Derived data ---- */
  const activePredictions = predictions.filter((p) => !p.resolved);
  const historyPredictions = predictions.filter((p) => p.resolved).slice(0, 20);
  const winRate =
    stats.totalPredictions > 0
      ? ((stats.wins / stats.totalPredictions) * 100).toFixed(1)
      : "0.0";
  const levelName = LEVEL_NAMES[stats.level] || "Legendary";
  const xpProgress =
    stats.xpToNextLevel > 0
      ? (stats.currentXp / stats.xpToNextLevel) * 100
      : 0;

  const currentPrice = currentPrices[selectedToken.id];

  const formatPrice = (v: number, d: number) => `$${v.toFixed(d)}`;
  const formatTimeLeft = (expiresAt: number) => {
    const ms = expiresAt - Date.now();
    if (ms <= 0) return "Resolving...";
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    if (h > 0) return `${h}h ${m}m left`;
    return `${m}m left`;
  };

  /* ---- Render ---- */
  return (
    <div className="pyth-card-elevated p-6">
      {/* ---- Win/Lose Celebration Overlay ---- */}
      <AnimatePresence>
        {justWon && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          >
            <div className="bg-emerald-500/20 backdrop-blur-xl border border-emerald-500/30 rounded-2xl p-8 text-center shadow-2xl shadow-emerald-500/20">
              <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4 animate-bounce" />
              <div className="text-3xl font-bold text-emerald-300">
                Prediction Correct!
              </div>
              <div className="text-emerald-400 mt-2">+Points earned!</div>
            </div>
          </motion.div>
        )}
        {justLost && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          >
            <div className="bg-red-500/10 backdrop-blur-xl border border-red-500/20 rounded-2xl p-8 text-center">
              <XCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
              <div className="text-xl font-bold text-red-300">
                Not this time!
              </div>
              <div className="text-gray-400 mt-1 text-sm">
                Keep trying, you earn XP either way
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---- Header ---- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center">
            <Target className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">
              Predict &amp; Earn
            </h2>
            <p className="text-gray-500 text-sm">
              Make your own price predictions, climb the ranks
            </p>
          </div>
        </div>

        {/* User Level Badge */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="flex items-center gap-1.5 justify-end">
              <Star className="w-3.5 h-3.5 text-yellow-400" />
              <span className="text-sm font-bold text-yellow-300">
                Level {stats.level + 1}
              </span>
            </div>
            <div className="text-[11px] text-gray-500">{levelName}</div>
          </div>
          <div className="w-20">
            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${xpProgress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <div className="text-[9px] text-gray-600 mt-0.5 text-center">
              {stats.currentXp}/{stats.xpToNextLevel} XP
            </div>
          </div>
        </div>
      </div>

      {/* ---- Stats Row ---- */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-6">
        <div className="rounded-lg bg-white/[0.02] border border-purple-500/8 p-3 text-center">
          <div className="text-gray-500 text-[10px] font-medium">Points</div>
          <div className="text-lg font-bold text-yellow-300 font-mono">
            {stats.totalPoints.toLocaleString()}
          </div>
        </div>
        <div className="rounded-lg bg-white/[0.02] border border-purple-500/8 p-3 text-center">
          <div className="text-gray-500 text-[10px] font-medium">Win Rate</div>
          <div className="text-lg font-bold text-purple-200">{winRate}%</div>
        </div>
        <div className="rounded-lg bg-white/[0.02] border border-purple-500/8 p-3 text-center">
          <div className="text-gray-500 text-[10px] font-medium">Streak</div>
          <div className="text-lg font-bold text-orange-300 flex items-center justify-center gap-1">
            {stats.currentStreak > 0 && (
              <FireIcon className="w-4 h-4 text-orange-400" />
            )}
            {stats.currentStreak}
          </div>
        </div>
        <div className="rounded-lg bg-white/[0.02] border border-purple-500/8 p-3 text-center">
          <div className="text-gray-500 text-[10px] font-medium">Best Streak</div>
          <div className="text-lg font-bold text-emerald-300">
            {stats.bestStreak}
          </div>
        </div>
        <div className="rounded-lg bg-white/[0.02] border border-purple-500/8 p-3 text-center">
          <div className="text-gray-500 text-[10px] font-medium">
            W / L
          </div>
          <div className="text-lg font-bold text-white">
            <span className="text-emerald-400">{stats.wins}</span>
            <span className="text-gray-600 mx-1">/</span>
            <span className="text-red-400">{stats.losses}</span>
          </div>
        </div>
      </div>

      {/* ---- Prediction Form ---- */}
      <div className="rounded-xl border border-purple-500/10 bg-white/[0.02] p-5">
        <h3 className="text-sm font-semibold text-purple-200 mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4 text-yellow-400" />
          New Prediction
        </h3>

        {/* Token Selector */}
        <div className="flex flex-wrap gap-2 mb-4">
          {TOKENS.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedToken(t)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                selectedToken.id === t.id
                  ? "border-purple-500/40 bg-purple-500/15 text-purple-200"
                  : "border-white/5 bg-white/[0.02] text-gray-400 hover:text-gray-200 hover:border-purple-500/20"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Current Price */}
        <div className="flex items-center gap-3 mb-5 p-3 rounded-lg bg-white/[0.02] border border-white/5">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selectedToken.bgClass}`}>
            {selectedToken.icon}
          </div>
          <div>
            <div className="text-[11px] text-gray-500">Current Price</div>
            <div className="text-xl font-bold text-white font-mono">
              {currentPrice
                ? formatPrice(currentPrice, selectedToken.decimals)
                : "Loading..."}
            </div>
          </div>
        </div>

        {/* Direction */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            onClick={() => setDirection("up")}
            className={`flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all border ${
              direction === "up"
                ? "border-emerald-500/40 bg-emerald-500/15 text-emerald-300 shadow-lg shadow-emerald-500/5"
                : "border-white/5 bg-white/[0.02] text-gray-400 hover:border-emerald-500/20"
            }`}
          >
            <ArrowUp className="w-5 h-5" />
            Price Goes Up
          </button>
          <button
            onClick={() => setDirection("down")}
            className={`flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all border ${
              direction === "down"
                ? "border-red-500/40 bg-red-500/15 text-red-300 shadow-lg shadow-red-500/5"
                : "border-white/5 bg-white/[0.02] text-gray-400 hover:border-red-500/20"
            }`}
          >
            <ArrowDown className="w-5 h-5" />
            Price Goes Down
          </button>
        </div>

        {/* Target Percent + Timeframe */}
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div>
            <label className="text-[11px] text-gray-500 font-medium block mb-2">
              Target Change (%)
            </label>
            <div className="flex gap-1.5">
              {[1, 2, 5, 10].map((pct) => (
                <button
                  key={pct}
                  onClick={() => setTargetPercent(pct)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all border ${
                    targetPercent === pct
                      ? "border-purple-500/40 bg-purple-500/15 text-purple-200"
                      : "border-white/5 bg-white/[0.02] text-gray-400 hover:border-purple-500/20"
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[11px] text-gray-500 font-medium block mb-2">
              Timeframe
            </label>
            <div className="flex gap-1.5">
              {TIMEFRAMES.map((tf) => (
                <button
                  key={tf.value}
                  onClick={() => setTimeframe(tf.value)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all border ${
                    timeframe === tf.value
                      ? "border-purple-500/40 bg-purple-500/15 text-purple-200"
                      : "border-white/5 bg-white/[0.02] text-gray-400 hover:border-purple-500/20"
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Submit */}
        <button
          onClick={handlePredict}
          disabled={!currentPrice}
          className="w-full pyth-btn-primary py-3 text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40"
        >
          <Target className="w-4 h-4" />
          Submit Prediction — {selectedToken.label}{" "}
          {direction === "up" ? "↑" : "↓"} {targetPercent}% in{" "}
          {TIMEFRAMES.find((t) => t.value === timeframe)?.label}
        </button>
      </div>

      {/* ---- Active Predictions ---- */}
      {activePredictions.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold text-purple-200 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-400" />
            Active Predictions ({activePredictions.length})
          </h3>
          <div className="space-y-2">
            {activePredictions.map((pred) => {
              const token = TOKENS.find((t) => t.id === pred.tokenId);
              const livePrice = currentPrices[pred.tokenId];
              const liveChange = livePrice
                ? ((livePrice - pred.entryPrice) / pred.entryPrice) * 100
                : 0;
              const onTrack =
                pred.direction === "up" ? liveChange > 0 : liveChange < 0;

              return (
                <motion.div
                  key={pred.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`rounded-lg border p-3 flex items-center gap-3 ${
                    onTrack
                      ? "border-emerald-500/15 bg-emerald-500/5"
                      : "border-red-500/10 bg-red-500/5"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${token?.bgClass || "bg-white/5"}`}>
                    {token?.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-white text-xs font-semibold">
                        {token?.label}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          pred.direction === "up"
                            ? "bg-emerald-500/15 text-emerald-400"
                            : "bg-red-500/15 text-red-400"
                        }`}
                      >
                        {pred.direction === "up" ? "↑" : "↓"}{" "}
                        {pred.targetPercent}%
                      </span>
                    </div>
                    <div className="text-[10px] text-gray-500 mt-0.5">
                      Entry: ${pred.entryPrice.toFixed(token?.decimals || 4)}{" "}
                      &middot; Now:{" "}
                      <span
                        className={
                          onTrack ? "text-emerald-400" : "text-red-400"
                        }
                      >
                        {livePrice
                          ? `$${livePrice.toFixed(token?.decimals || 4)}`
                          : "..."}
                        {" ("}
                        {liveChange >= 0 ? "+" : ""}
                        {liveChange.toFixed(2)}%)
                      </span>
                    </div>
                  </div>
                  <div className="text-[11px] text-gray-500 shrink-0">
                    {formatTimeLeft(pred.expiresAt)}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* ---- History Toggle ---- */}
      {historyPredictions.length > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="text-sm text-purple-400 hover:text-purple-300 flex items-center gap-2 transition-colors"
          >
            <BarChart3 className="w-4 h-4" />
            {showHistory ? "Hide" : "Show"} Prediction History (
            {historyPredictions.length})
          </button>

          <AnimatePresence>
            {showHistory && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mt-3 space-y-2"
              >
                {historyPredictions.map((pred) => {
                  const token = TOKENS.find((t) => t.id === pred.tokenId);
                  return (
                    <div
                      key={pred.id}
                      className={`rounded-lg border p-3 flex items-center gap-3 ${
                        pred.won
                          ? "border-emerald-500/10 bg-emerald-500/5"
                          : "border-red-500/8 bg-red-500/5"
                      }`}
                    >
                      <div className="w-6 h-6 flex items-center justify-center shrink-0">
                        {pred.won ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-white text-xs font-semibold">
                            {token?.label}
                          </span>
                          <span className="text-[10px] text-gray-500">
                            {pred.direction === "up" ? "↑" : "↓"}{" "}
                            {pred.targetPercent}%
                          </span>
                        </div>
                        <div className="text-[10px] text-gray-500">
                          ${pred.entryPrice.toFixed(token?.decimals || 4)} →{" "}
                          ${pred.exitPrice?.toFixed(token?.decimals || 4) || "?"}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div
                          className={`text-xs font-bold ${
                            pred.won ? "text-emerald-400" : "text-red-400"
                          }`}
                        >
                          {pred.won ? "Won" : "Lost"}
                        </div>
                        <div className="text-[10px] text-yellow-400 font-mono">
                          +{pred.pointsEarned || 0} pts
                        </div>
                      </div>
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ---- Rank Badges ---- */}
      <div className="mt-6 pt-5 border-t border-purple-500/5">
        <h3 className="text-[11px] text-gray-500 uppercase tracking-wider font-semibold mb-3">
          Rank Progression
        </h3>
        <div className="flex flex-wrap gap-2">
          {LEVEL_NAMES.map((name, idx) => (
            <div
              key={name}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all ${
                idx <= stats.level
                  ? "border-yellow-500/20 bg-yellow-500/10 text-yellow-300"
                  : "border-white/5 bg-white/[0.01] text-gray-700"
              }`}
            >
              {idx < stats.level ? (
                <Medal className="w-3 h-3" />
              ) : idx === stats.level ? (
                <Star className="w-3 h-3 text-yellow-400" />
              ) : (
                <div className="w-3 h-3 rounded-full border border-gray-700" />
              )}
              {name}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
