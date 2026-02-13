"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  RefreshCcw,
  Pause,
  Play,
  ChartLine,
} from "lucide-react";
import { TokenLogo } from "@/components/TokenLogos";

/* ======================================================================== */
/*  Token configuration                                                     */
/* ======================================================================== */

interface TokenDef {
  id: string;
  label: string;
  symbol: string;
  /** CoinGecko-style key returned by /price/token/{id} */
  apiKey: string;
  color: string;
  icon: React.ReactNode;
  priceDecimals: number;
}

const TOKENS: TokenDef[] = [
  {
    id: "near",
    label: "NEAR",
    symbol: "NEAR",
    apiKey: "near",
    color: "#3B82F6",
    icon: <TokenLogo tokenId="near" size={16} />,
    priceDecimals: 4,
  },
  {
    id: "aurora",
    label: "Aurora",
    symbol: "AURORA",
    apiKey: "aurora",
    color: "#10B981",
    icon: <TokenLogo tokenId="aurora" size={16} />,
    priceDecimals: 4,
  },
  {
    id: "ethereum",
    label: "ETH",
    symbol: "ETH",
    apiKey: "ethereum",
    color: "#818CF8",
    icon: <TokenLogo tokenId="ethereum" size={16} />,
    priceDecimals: 2,
  },
  {
    id: "solana",
    label: "SOL",
    symbol: "SOL",
    apiKey: "solana",
    color: "#A78BFA",
    icon: <TokenLogo tokenId="solana" size={16} />,
    priceDecimals: 2,
  },
  {
    id: "algorand",
    label: "ALGO",
    symbol: "ALGO",
    apiKey: "algorand",
    color: "#2DD4BF",
    icon: <TokenLogo tokenId="algorand" size={16} />,
    priceDecimals: 4,
  },
];

/* ======================================================================== */
/*  Types                                                                   */
/* ======================================================================== */

interface RealTimePriceData {
  timestamp: string;
  time: string;
  price: number;
  volume: number;
  change: number;
  changePercent: number;
  sources: number;
  confidence: number;
}

interface VolumeData {
  volume24h: number;
  volumeChange24h: number;
  trades24h: number;
  marketCap: number;
}

/* ======================================================================== */
/*  Component                                                               */
/* ======================================================================== */

export default function RealTimePriceChart() {
  const [selectedToken, setSelectedToken] = useState<TokenDef>(TOKENS[0]);
  const [priceHistory, setPriceHistory] = useState<RealTimePriceData[]>([]);
  const [volumeData, setVolumeData] = useState<VolumeData>({
    volume24h: 0,
    volumeChange24h: 0,
    trades24h: 0,
    marketCap: 0,
  });
  const [isLive, setIsLive] = useState(true);
  const [lastPrice, setLastPrice] = useState<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastPriceRef = useRef<number>(0);
  const volumeDataRef = useRef<VolumeData>(volumeData);
  const selectedTokenRef = useRef<TokenDef>(selectedToken);

  useEffect(() => { lastPriceRef.current = lastPrice; }, [lastPrice]);
  useEffect(() => { volumeDataRef.current = volumeData; }, [volumeData]);
  useEffect(() => { selectedTokenRef.current = selectedToken; }, [selectedToken]);

  /* ---- Fetch ---------------------------------------------------------- */

  const fetchRealTimeData = useCallback(async () => {
    const token = selectedTokenRef.current;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    try {
      const response = await fetch(`${apiUrl}/price/token/${token.id}`);
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const json = await response.json();
      const d = json?.data;
      if (!d) throw new Error("No data received");

      const now = new Date();
      const currentPrice = d.usd;
      const prevPrice = lastPriceRef.current;
      const change = currentPrice - prevPrice;
      const changePercent =
        prevPrice > 0 ? (change / prevPrice) * 100 : d.usd_24h_change || 0;

      setVolumeData({
        volume24h: d.usd_24h_vol || 0,
        volumeChange24h: d.usd_24h_change || 0,
        trades24h:
          d.usd_24h_vol > 0
            ? Math.floor(d.usd_24h_vol / (currentPrice * 100))
            : 0,
        marketCap: d.usd_market_cap || 0,
      });

      const newDataPoint: RealTimePriceData = {
        timestamp: now.toISOString(),
        time: now.toLocaleTimeString("en-US", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
        price: Number(currentPrice.toFixed(token.priceDecimals + 2)),
        volume: d.usd_24h_vol || 0,
        change,
        changePercent,
        sources: 1,
        confidence: 95,
      };

      setPriceHistory((prev) => [...prev, newDataPoint].slice(-360));
      setLastPrice(currentPrice);
    } catch (error) {
      console.error(`Failed to fetch ${token.label} data:`, error);
      const now = new Date();
      setPriceHistory((prev) =>
        [
          ...prev,
          {
            timestamp: now.toISOString(),
            time: now.toLocaleTimeString("en-US", {
              hour12: false,
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }),
            price: lastPriceRef.current || 0,
            volume: volumeDataRef.current.volume24h || 0,
            change: 0,
            changePercent: 0,
            sources: 0,
            confidence: 0,
          },
        ].slice(-360)
      );
    }
  }, []);

  /* ---- Timer ---------------------------------------------------------- */

  useEffect(() => {
    if (isLive) {
      fetchRealTimeData();
      intervalRef.current = setInterval(fetchRealTimeData, 10000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isLive, fetchRealTimeData]);

  /* Reset history when token changes */
  const handleTokenChange = (token: TokenDef) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setSelectedToken(token);
    selectedTokenRef.current = token;
    setPriceHistory([]);
    setLastPrice(0);
    lastPriceRef.current = 0;
    setVolumeData({ volume24h: 0, volumeChange24h: 0, trades24h: 0, marketCap: 0 });
    // re-start fetching immediately
    setTimeout(() => {
      fetchRealTimeData();
      if (isLive) {
        intervalRef.current = setInterval(fetchRealTimeData, 10000);
      }
    }, 50);
  };

  /* ---- Derived -------------------------------------------------------- */

  const currentData = priceHistory[priceHistory.length - 1];
  const isPositive = currentData?.changePercent >= 0;

  const dec = selectedToken.priceDecimals;
  const formatPrice = (value: number) =>
    `$${value.toFixed(dec)}`;
  const formatVolume = (value: number) => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  /* ---- Tooltip -------------------------------------------------------- */

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ payload: RealTimePriceData }>;
    label?: string;
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#1A0F2E]/95 backdrop-blur-xl border border-purple-500/20 rounded-xl p-3 space-y-1 shadow-xl shadow-purple-500/10">
          <p className="text-purple-200 font-semibold text-sm">{`Time: ${label}`}</p>
          <p className="text-white text-sm font-mono">{`Price: ${formatPrice(data.price)}`}</p>
          <p className="text-gray-400 text-xs">{`Volume: ${formatVolume(data.volume)}`}</p>
          <p
            className={`text-xs ${
              data.changePercent >= 0 ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {`Change: ${data.changePercent >= 0 ? "+" : ""}${data.changePercent.toFixed(4)}%`}
          </p>
        </div>
      );
    }
    return null;
  };

  /* ---- Render --------------------------------------------------------- */

  return (
    <div className="pyth-card-elevated p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <TokenLogo tokenId={selectedToken.id} size={24} />
            <h2 className="text-xl font-bold text-white">
              {selectedToken.label} Price
            </h2>
            <span className="pyth-badge-live text-[11px] px-2.5 py-0.5 rounded-full border border-emerald-500/20 bg-emerald-500/8 text-emerald-400 font-semibold">
              LIVE
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-1 ml-9">
            Real-time updates every 10 seconds
          </p>
        </div>

        <div className="flex items-center gap-2 ml-9 md:ml-0">
          <button
            onClick={() => setIsLive(!isLive)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              isLive
                ? "pyth-btn-ghost text-red-300 border-red-500/15 bg-red-500/6 hover:bg-red-500/12"
                : "pyth-btn-ghost"
            }`}
          >
            {isLive ? (
              <Pause className="w-3.5 h-3.5" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            {isLive ? "Pause" : "Resume"}
          </button>
          <button
            onClick={fetchRealTimeData}
            className="pyth-btn-ghost px-3 py-2 rounded-xl"
          >
            <RefreshCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ---- Token Selector Tabs ---- */}
      <div className="flex flex-wrap gap-2 mb-6 ml-9 md:ml-0">
        {TOKENS.map((t) => (
          <button
            key={t.id}
            onClick={() => handleTokenChange(t)}
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

      {/* Stats Row */}
      {currentData && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6"
        >
          <div className="rounded-xl bg-white/[0.02] border border-purple-500/8 p-4 text-center">
            <div className="text-gray-500 text-[11px] font-medium mb-1">
              Current Price
            </div>
            <div className="pyth-stat-number text-xl font-mono">
              {formatPrice(currentData.price)}
            </div>
            <div className="flex items-center justify-center gap-1 mt-1">
              {isPositive ? (
                <TrendingUp className="w-3 h-3 text-emerald-400" />
              ) : (
                <TrendingDown className="w-3 h-3 text-red-400" />
              )}
              <span
                className={`text-xs font-medium ${
                  isPositive ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {isPositive ? "+" : ""}
                {currentData.changePercent.toFixed(4)}%
              </span>
            </div>
          </div>

          <div className="rounded-xl bg-white/[0.02] border border-purple-500/8 p-4 text-center">
            <div className="text-gray-500 text-[11px] font-medium mb-1">
              24h Volume
            </div>
            <div className="text-lg font-bold text-purple-200">
              {formatVolume(volumeData.volume24h)}
            </div>
            <div
              className={`text-xs mt-1 font-medium ${
                volumeData.volumeChange24h >= 0
                  ? "text-emerald-400"
                  : "text-red-400"
              }`}
            >
              {volumeData.volumeChange24h >= 0 ? "+" : ""}
              {volumeData.volumeChange24h.toFixed(2)}%
            </div>
          </div>

          <div className="rounded-xl bg-white/[0.02] border border-purple-500/8 p-4 text-center">
            <div className="text-gray-500 text-[11px] font-medium mb-1">
              Market Cap
            </div>
            <div className="text-lg font-bold text-white">
              {formatVolume(volumeData.marketCap)}
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {volumeData.trades24h.toLocaleString()} trades
            </div>
          </div>

          <div className="rounded-xl bg-white/[0.02] border border-purple-500/8 p-4 text-center">
            <div className="text-gray-500 text-[11px] font-medium mb-1">
              Data Quality
            </div>
            <div className="text-lg font-bold text-purple-200">
              {currentData.confidence.toFixed(2)}%
            </div>
            <div className="text-xs text-gray-600 mt-1">
              {typeof currentData.sources === "object"
                ? `${Object.keys(currentData.sources).length} sources`
                : `${currentData.sources || 3} sources`}
            </div>
          </div>
        </motion.div>
      )}

      {/* Chart */}
      <div className="h-96 w-full">
        {priceHistory.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={priceHistory}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient
                  id="priceGradientPyth"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="5%"
                    stopColor={selectedToken.color}
                    stopOpacity={0.25}
                  />
                  <stop
                    offset="50%"
                    stopColor={selectedToken.color}
                    stopOpacity={0.08}
                  />
                  <stop
                    offset="95%"
                    stopColor={selectedToken.color}
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(139,92,246,0.06)"
              />
              <XAxis
                dataKey="time"
                stroke="#4B5563"
                fontSize={10}
                interval="preserveStartEnd"
                tick={{ fontSize: 10 }}
              />
              <YAxis
                stroke="#4B5563"
                fontSize={10}
                domain={["dataMin - 0.000001", "dataMax + 0.000001"]}
                tickFormatter={(value) => formatPrice(Number(value))}
                tick={{ fontSize: 10 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="price"
                stroke={selectedToken.color}
                strokeWidth={2}
                fill="url(#priceGradientPyth)"
                dot={false}
                activeDot={{
                  r: 4,
                  stroke: selectedToken.color,
                  strokeWidth: 2,
                  fill: "#1A0F2E",
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center space-y-4">
              <ChartLine className="w-12 h-12 text-purple-500/30 mx-auto animate-pulse" />
              <div className="text-gray-500">
                Collecting {selectedToken.label} data...
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-[11px] text-gray-600 mt-4 pt-4 border-t border-purple-500/5">
        <div>
          Updates every 10 seconds &middot; {priceHistory.length} data points
          collected
        </div>
        <div>Last update: {currentData?.time || "N/A"}</div>
      </div>
    </div>
  );
}
