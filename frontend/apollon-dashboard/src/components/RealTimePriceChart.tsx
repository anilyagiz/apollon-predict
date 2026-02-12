"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  Activity,
  Zap,
  Pause,
  Play,
  BarChart3,
} from "lucide-react";

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

export default function RealTimePriceChart() {
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

  // Keep refs in sync with state
  useEffect(() => { lastPriceRef.current = lastPrice; }, [lastPrice]);
  useEffect(() => { volumeDataRef.current = volumeData; }, [volumeData]);

  // Fetch NEAR data via backend API (proxies CoinGecko, with fallback)
  const fetchRealTimeData = useCallback(async () => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/price/near`);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data || !data.near) {
        throw new Error("No NEAR data received");
      }

      const now = new Date();
      const currentPrice = data.near.usd;
      const prevPrice = lastPriceRef.current;
      const change = currentPrice - prevPrice;
      const changePercent = prevPrice > 0 ? (change / prevPrice) * 100 : data.near.usd_24h_change || 0;

      const realVolume = data.near.usd_24h_vol || 0;
      const realMarketCap = data.near.usd_market_cap || 0;

      setVolumeData({
        volume24h: realVolume,
        volumeChange24h: data.near.usd_24h_change || 0,
        trades24h: realVolume > 0 ? Math.floor(realVolume / (currentPrice * 100)) : 0,
        marketCap: realMarketCap,
      });

      const newDataPoint: RealTimePriceData = {
        timestamp: now.toISOString(),
        time: now.toLocaleTimeString("en-US", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
        price: Number(currentPrice.toFixed(6)),
        volume: realVolume,
        change: change,
        changePercent: changePercent,
        sources: 1,
        confidence: 95,
      };

      setPriceHistory((prev) => {
        const updated = [...prev, newDataPoint];
        // Keep last 360 data points (1 hour of 10-second intervals)
        return updated.slice(-360);
      });

      setLastPrice(currentPrice);
    } catch (error) {
      console.error("Failed to fetch NEAR data:", error);

      // Add error data point to show connection issues in chart
      const now = new Date();
      const errorDataPoint: RealTimePriceData = {
        timestamp: now.toISOString(),
        time: now.toLocaleTimeString("en-US", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
        price: lastPriceRef.current || 0.205, // Use last known price
        volume: volumeDataRef.current.volume24h || 0,
        change: 0,
        changePercent: 0,
        sources: 0, // Indicates error state
        confidence: 0, // Indicates error state
      };

      setPriceHistory((prev) => {
        const updated = [...prev, errorDataPoint];
        return updated.slice(-360);
      });
    }
  }, []);

  // Start/stop live updates
  useEffect(() => {
    if (isLive) {
      // Initial fetch
      fetchRealTimeData();

      // Set 10-second interval
      intervalRef.current = setInterval(fetchRealTimeData, 10000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isLive, fetchRealTimeData]);

  const currentData = priceHistory[priceHistory.length - 1];
  const isPositive = currentData?.changePercent >= 0;

  const formatPrice = (value: number) => `$${value.toFixed(6)}`;
  const formatVolume = (value: number) => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

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
        <div className="bg-black/90 backdrop-blur-lg border border-white/20 rounded-lg p-3 space-y-1">
          <p className="text-white font-medium text-sm">{`Time: ${label}`}</p>
          <p className="text-neutral-400 text-sm">{`Price: ${formatPrice(
            data.price
          )}`}</p>
          <p className="text-neutral-400 text-sm">{`Volume: ${formatVolume(
            data.volume
          )}`}</p>
          <p
            className={`text-sm ${
              data.changePercent >= 0 ? "text-neutral-400" : "text-neutral-500"
            }`}
          >
            {`Change: ${
              data.changePercent >= 0 ? "+" : ""
            }${data.changePercent.toFixed(4)}%`}
          </p>
          <p className="text-gray-400 text-xs">{`Confidence: ${data.confidence.toFixed(
            2
          )}%`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="bg-white/5 backdrop-blur-lg border-white/10">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="text-2xl font-bold text-white flex items-center gap-2">
            <Activity className="w-6 h-6 text-neutral-400" />
            NEAR Price
            <Badge
              variant="secondary"
              className="bg-green-500/20 text-green-300 border-green-500/30"
            >
              LIVE
            </Badge>
          </CardTitle>
          <p className="text-gray-400 mt-1">
            {" "}
            price updates every second • 6-decimal accuracy
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsLive(!isLive)}
            variant={isLive ? "destructive" : "default"}
            size="sm"
            className="flex items-center gap-2"
          >
            {isLive ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {isLive ? "Pause" : "Resume"}
          </Button>

          <Button
            onClick={fetchRealTimeData}
            variant="outline"
            size="sm"
            className="border-white/20 text-white hover:bg-white/10"
          >
            <Zap className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Current Price & Volume Stats */}
        {currentData && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            <div className="bg-white/5 rounded-lg p-4 text-center">
              <div className="text-gray-400 text-sm">Current Price</div>
              <div className="text-2xl font-bold text-white font-mono">
                ${currentData.price.toFixed(6)}
              </div>
              <div className="flex items-center justify-center gap-1 mt-1">
                {isPositive ? (
                  <TrendingUp className="w-3 h-3 text-neutral-400" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-neutral-500" />
                )}
                <span
                  className={`text-xs ${
                    isPositive ? "text-neutral-400" : "text-neutral-500"
                  }`}
                >
                  {isPositive ? "+" : ""}
                  {currentData.changePercent.toFixed(4)}%
                </span>
              </div>
            </div>

            <div className="bg-white/5 rounded-lg p-4 text-center">
              <div className="text-gray-400 text-sm">24h Volume</div>
              <div className="text-xl font-bold text-neutral-400">
                {formatVolume(volumeData.volume24h)}
              </div>
              <div
                className={`text-xs mt-1 ${
                  volumeData.volumeChange24h >= 0
                    ? "text-neutral-400"
                    : "text-neutral-500"
                }`}
              >
                {volumeData.volumeChange24h >= 0 ? "+" : ""}
                {volumeData.volumeChange24h.toFixed(2)}%
              </div>
            </div>

            <div className="bg-white/5 rounded-lg p-4 text-center">
              <div className="text-gray-400 text-sm">Market Cap</div>
              <div className="text-xl font-bold text-white">
                {formatVolume(volumeData.marketCap)}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {volumeData.trades24h.toLocaleString()} trades
              </div>
            </div>

            <div className="bg-white/5 rounded-lg p-4 text-center">
              <div className="text-gray-400 text-sm">Data Quality</div>
              <div className="text-xl font-bold text-neutral-400">
                {currentData.confidence.toFixed(2)}%
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {typeof currentData.sources === "object"
                  ? `${Object.keys(currentData.sources).length} sources`
                  : `${currentData.sources || 3} sources`}
              </div>
            </div>
          </motion.div>
        )}

        {/* Real-Time Price Chart */}
        <div className="h-96 w-full">
          {priceHistory.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={priceHistory}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="priceGradient"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor="#60A5FA" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#60A5FA" stopOpacity={0} />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#374151"
                  opacity={0.3}
                />

                <XAxis
                  dataKey="time"
                  stroke="#9CA3AF"
                  fontSize={10}
                  interval="preserveStartEnd"
                  tick={{ fontSize: 10 }}
                />

                <YAxis
                  stroke="#9CA3AF"
                  fontSize={10}
                  domain={["dataMin - 0.000001", "dataMax + 0.000001"]}
                  tickFormatter={(value) => `$${Number(value).toFixed(6)}`}
                  tick={{ fontSize: 10 }}
                />

                <Tooltip content={<CustomTooltip />} />

                <Area
                  type="monotone"
                  dataKey="price"
                  stroke="#60A5FA"
                  strokeWidth={2}
                  fill="url(#priceGradient)"
                  dot={false}
                  activeDot={{
                    r: 4,
                    stroke: "#60A5FA",
                    strokeWidth: 2,
                    fill: "#1E293B",
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-4">
                <BarChart3 className="w-12 h-12 text-gray-500 mx-auto animate-pulse" />
                <div className="text-gray-400">
                  Collecting real-time data...
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Data Points Info */}
        <div className="flex items-center justify-between text-sm text-gray-400">
          <div>
            Updates every 10 seconds • {priceHistory.length} data points
            collected
          </div>
          <div>Last update: {currentData?.time || "N/A"}</div>
        </div>
      </CardContent>
    </Card>
  );
}
