'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import {
  RefreshCw,
  Sparkles,
  BrainCircuit,
  Timer,
} from 'lucide-react';
import { TokenLogo } from '@/components/TokenLogos';

/* ======================================================================== */
/*  Token config for predictions                                            */
/* ======================================================================== */

interface PredTokenDef {
  id: string;
  label: string;
  /** Symbol sent to the /predict API (e.g. "NEARUSD") */
  symbol: string;
  color: string;
  icon: React.ReactNode;
  priceDecimals: number;
}

const PRED_TOKENS: PredTokenDef[] = [
  { id: 'near', label: 'NEAR', symbol: 'NEARUSD', color: '#3B82F6', icon: <TokenLogo tokenId="near" size={16} />, priceDecimals: 4 },
  { id: 'aurora', label: 'Aurora', symbol: 'AURORAUSD', color: '#10B981', icon: <TokenLogo tokenId="aurora" size={16} />, priceDecimals: 4 },
  { id: 'ethereum', label: 'ETH', symbol: 'ETHUSD', color: '#818CF8', icon: <TokenLogo tokenId="ethereum" size={16} />, priceDecimals: 2 },
  { id: 'solana', label: 'SOL', symbol: 'SOLUSD', color: '#A78BFA', icon: <TokenLogo tokenId="solana" size={16} />, priceDecimals: 2 },
  { id: 'algorand', label: 'ALGO', symbol: 'ALGOUSD', color: '#2DD4BF', icon: <TokenLogo tokenId="algorand" size={16} />, priceDecimals: 4 },
];

/* ======================================================================== */
/*  Types                                                                   */
/* ======================================================================== */

interface PredictionData {
  symbol: string;
  timeframe: string;
  predicted_price: number;
  current_price: number;
  price_change: number;
  price_change_percent: number;
  confidence: number;
  confidence_interval: { lower: number; upper: number };
  individual_predictions: { lstm: number; gru: number; prophet: number; xgboost: number };
  model_weights: { lstm: number; gru: number; prophet: number; xgboost: number };
  timestamp: string;
}

interface ChartDataPoint {
  time: string;
  current: number;
  predicted: number;
  lower: number;
  upper: number;
  lstm: number;
  gru: number;
  prophet: number;
  xgboost: number;
}

/* ======================================================================== */
/*  Component                                                               */
/* ======================================================================== */

export default function PredictionChart() {
  const [selectedToken, setSelectedToken] = useState<PredTokenDef>(PRED_TOKENS[0]);
  const [predictionData, setPredictionData] = useState<PredictionData | null>(null);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generatePrediction = async (token?: PredTokenDef) => {
    const tok = token || selectedToken;
    try {
      setIsLoading(true);
      setError(null);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: tok.symbol, timeframe: '24h' })
      });

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data: PredictionData = await response.json();
      setPredictionData(data);

      const now = new Date();
      const futureTime = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      setChartData([
        {
          time: now.toLocaleTimeString(),
          current: data.current_price, predicted: data.current_price,
          lower: data.current_price, upper: data.current_price,
          ...data.individual_predictions
        },
        {
          time: futureTime.toLocaleTimeString(),
          current: data.current_price, predicted: data.predicted_price,
          lower: data.confidence_interval.lower, upper: data.confidence_interval.upper,
          ...data.individual_predictions
        },
      ]);
    } catch (err) {
      console.error('Prediction error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate prediction');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTokenChange = (token: PredTokenDef) => {
    setSelectedToken(token);
    setPredictionData(null);
    setChartData([]);
    generatePrediction(token);
  };

  useEffect(() => { generatePrediction(); }, []);

  const dec = selectedToken.priceDecimals;
  const formatPrice = (value: number) => `$${value.toFixed(dec)}`;
  const formatPercent = (value: number) => `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;

  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ value: number; dataKey: string; color: string }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-[#1A0F2E]/95 backdrop-blur-xl border border-purple-500/20 rounded-xl p-3 space-y-1.5 shadow-xl">
          <p className="text-purple-200 font-semibold text-sm">{`Time: ${label}`}</p>
          {payload.map((entry, index: number) => (
            <p key={index} className="text-xs font-mono" style={{ color: entry.color }}>
              {`${entry.dataKey}: ${formatPrice(entry.value)}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="pyth-card-elevated p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-purple-400" />
            <h2 className="text-xl font-bold text-white">{selectedToken.label} Price Prediction</h2>
          </div>
          <p className="text-gray-500 text-sm mt-1 ml-9">24-hour ML ensemble forecasting &mdash; {selectedToken.symbol}</p>
        </div>

        <button
          onClick={() => generatePrediction()}
          disabled={isLoading}
          className="pyth-btn-primary px-5 py-2.5 flex items-center gap-2 text-sm ml-9 md:ml-0 w-fit"
        >
          {isLoading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <BrainCircuit className="w-4 h-4" />
          )}
          {isLoading ? 'Generating...' : 'New Prediction'}
        </button>
      </div>

      {/* Token Selector Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 ml-9 md:ml-0">
        {PRED_TOKENS.map((t) => (
          <button
            key={t.id}
            onClick={() => handleTokenChange(t)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
              selectedToken.id === t.id
                ? 'border-purple-500/40 bg-purple-500/15 text-purple-200'
                : 'border-white/5 bg-white/[0.02] text-gray-400 hover:text-gray-200 hover:border-purple-500/20'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-red-500/8 border border-red-500/15 rounded-xl p-4 mb-6">
          <p className="text-red-300 text-sm">Error: {error}</p>
          <button onClick={() => generatePrediction()} className="pyth-btn-ghost mt-2 px-3 py-1.5 text-xs rounded-lg text-red-300 border-red-500/20">
            Retry
          </button>
        </div>
      )}

      {/* Prediction Summary */}
      {predictionData && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="rounded-xl bg-white/[0.02] border border-purple-500/8 p-4 text-center">
            <div className="text-gray-500 text-[11px] font-medium">Current Price</div>
            <div className="pyth-stat-number text-xl mt-1">{formatPrice(predictionData.current_price)}</div>
          </div>
          <div className="rounded-xl bg-white/[0.02] border border-purple-500/8 p-4 text-center">
            <div className="text-gray-500 text-[11px] font-medium">24h Prediction</div>
            <div className="pyth-stat-number text-xl mt-1">{formatPrice(predictionData.predicted_price)}</div>
          </div>
          <div className="rounded-xl bg-white/[0.02] border border-purple-500/8 p-4 text-center">
            <div className="text-gray-500 text-[11px] font-medium">Expected Change</div>
            <div className={`text-xl font-bold mt-1 ${predictionData.price_change >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatPercent(predictionData.price_change_percent)}
            </div>
          </div>
          <div className="rounded-xl bg-white/[0.02] border border-purple-500/8 p-4 text-center">
            <div className="text-gray-500 text-[11px] font-medium">Confidence</div>
            <div className="text-xl font-bold text-purple-300 mt-1">{(predictionData.confidence * 100).toFixed(1)}%</div>
          </div>
        </motion.div>
      )}

      {/* Chart */}
      <div className="h-80 w-full">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(139,92,246,0.06)" />
              <XAxis dataKey="time" stroke="#4B5563" fontSize={12} />
              <YAxis stroke="#4B5563" fontSize={12} tickFormatter={formatPrice} />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="upper" stroke="#EF4444" strokeWidth={1} strokeDasharray="5 5" dot={false} />
              <Line type="monotone" dataKey="lower" stroke="#EF4444" strokeWidth={1} strokeDasharray="5 5" dot={false} />
              <Line type="monotone" dataKey="current" stroke="#6B7280" strokeWidth={2} dot={{ fill: '#6B7280', strokeWidth: 2, r: 4 }} />
              <Line type="monotone" dataKey="predicted" stroke={selectedToken.color} strokeWidth={3} dot={{ fill: selectedToken.color, strokeWidth: 2, r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-4">
              <Timer className="w-12 h-12 text-purple-500/30 mx-auto" />
              <div className="text-gray-500">{isLoading ? `Generating ${selectedToken.label} prediction...` : 'No prediction data available'}</div>
            </div>
          </div>
        )}
      </div>

      {/* Individual Model Predictions */}
      {predictionData && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="mt-6 pt-6 border-t border-purple-500/5">
          <h3 className="text-sm font-semibold text-purple-200 mb-4">Individual Model Predictions &mdash; {selectedToken.label}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(predictionData.individual_predictions).map(([model, prediction]) => {
              const weight = predictionData.model_weights[model as keyof typeof predictionData.model_weights];
              const colors: Record<string, string> = {
                lstm: 'border-violet-500/15 bg-violet-500/5',
                gru: 'border-purple-500/15 bg-purple-500/5',
                prophet: 'border-blue-500/15 bg-blue-500/5',
                xgboost: 'border-cyan-500/15 bg-cyan-500/5'
              };
              const textColors: Record<string, string> = {
                lstm: 'text-violet-300',
                gru: 'text-purple-300',
                prophet: 'text-blue-300',
                xgboost: 'text-cyan-300'
              };
              return (
                <div key={model} className={`rounded-xl p-3 border ${colors[model]}`}>
                  <div className={`text-[11px] font-bold uppercase tracking-wider ${textColors[model]}`}>{model}</div>
                  <div className="text-lg font-bold text-white mt-1 font-mono">{formatPrice(prediction)}</div>
                  <span className="text-[10px] text-gray-500 font-medium">{(weight * 100).toFixed(0)}% weight</span>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
}
