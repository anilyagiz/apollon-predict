"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import dynamic from "next/dynamic";
import {
  TrendingUp,
  TrendingDown,
  CircleDollarSign,
  RefreshCcw,
  Pause,
  Play,
  ChartLine,
} from "lucide-react";

// Dynamic import for ApexCharts (client-side only)
const Chart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
  loading: () => (
    <div className="h-96 flex items-center justify-center text-gray-400">
      Loading chart...
    </div>
  ),
});

interface RealTimePriceData {
  timestamp: number;
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

export default function AdvancedRealTimeChart() {
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

  // Fetch real ALGO data from backend
  const fetchRealTimeData = useCallback(async () => {
    try {
      console.log("Fetching real-time ALGO data from backend...");

      const response = await fetch("http://localhost:8000/price/current");

      if (!response.ok) {
        throw new Error(`Backend aggregator error: ${response.status}`);
      }

      const backendData = await response.json();
      console.log("Backend data received:", backendData);

      if (!backendData || typeof backendData.aggregated_price !== "number") {
        throw new Error("No valid ALGO data received from aggregator");
      }

      const currentPrice = backendData.aggregated_price;
      const change = currentPrice - lastPrice;
      const changePercent = lastPrice > 0 ? (change / lastPrice) * 100 : 0;

      // Extract real volume from best source
      const bestVolumeSource = backendData.sources?.find(
        (s: { volume_24h: number }) => s.volume_24h > 0
      );
      const realVolume = bestVolumeSource?.volume_24h || 0;
      const realMarketCap = bestVolumeSource?.market_cap || 0;
      const realVolumeChange = bestVolumeSource?.change_24h || 0;

      setVolumeData({
        volume24h: realVolume,
        volumeChange24h: realVolumeChange,
        trades24h:
          realVolume > 0 ? Math.floor(realVolume / (currentPrice * 100)) : 0,
        marketCap: realMarketCap,
      });

      const newDataPoint: RealTimePriceData = {
        timestamp: Date.now(),
        price: Number(currentPrice.toFixed(6)),
        volume: realVolume,
        change: change,
        changePercent: changePercent,
        sources: backendData.source_count || 1,
        confidence: backendData.confidence * 100 || 100,
      };

      setPriceHistory((prev) => {
        const updated = [...prev, newDataPoint];
        return updated.slice(-360); // Keep last 1 hour of 10-second intervals
      });

      console.log("  Data point added:", {
        price: currentPrice,
        volume: realVolume,
        sources: backendData.source_count,
        dataPoints: priceHistory.length + 1,
      });

      setLastPrice(currentPrice);
    } catch (error) {
      console.error("Failed to fetch real ALGO data:", error);

      // Add error data point to show connection issues
      const errorDataPoint: RealTimePriceData = {
        timestamp: Date.now(),
        price: lastPrice || 0.205,
        volume: volumeData.volume24h || 0,
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
  }, [lastPrice, priceHistory.length, volumeData]);

  // Start/stop live updates
  useEffect(() => {
    if (isLive) {
      fetchRealTimeData();
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

  // ApexCharts configuration for crypto-style chart
  const chartOptions = {
    chart: {
      type: "area" as const,
      height: 400,
      background: "transparent",
      foreColor: "#9CA3AF",
      toolbar: {
        show: false,
      },
      zoom: {
        enabled: false,
      },
      animations: {
        enabled: true,
        easing: "easeinout",
        speed: 500,
        animateGradually: {
          enabled: true,
          delay: 150,
        },
      },
    },
    theme: {
      mode: "dark" as const,
    },
    grid: {
      borderColor: "#374151",
      strokeDashArray: 1,
      xaxis: {
        lines: {
          show: true,
        },
      },
      yaxis: {
        lines: {
          show: true,
        },
      },
    },
    stroke: {
      curve: "smooth" as const,
      width: 2,
      colors: [isPositive ? "#10B981" : "#EF4444"],
    },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.3,
        opacityTo: 0.1,
        stops: [0, 100],
        colorStops: [
          {
            offset: 0,
            color: isPositive ? "#10B981" : "#EF4444",
            opacity: 0.3,
          },
          {
            offset: 100,
            color: isPositive ? "#10B981" : "#EF4444",
            opacity: 0.1,
          },
        ],
      },
    },
    dataLabels: {
      enabled: false,
    },
    markers: {
      size: 0,
      hover: {
        size: 4,
        sizeOffset: 2,
      },
    },
    xaxis: {
      type: "datetime" as const,
      labels: {
        format: "HH:mm:ss",
        style: {
          colors: "#9CA3AF",
          fontSize: "10px",
        },
      },
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
    },
    yaxis: {
      labels: {
        formatter: (value: number) => formatPrice(value),
        style: {
          colors: "#9CA3AF",
          fontSize: "10px",
        },
      },
      min: (min: number) => min * 0.999,
      max: (max: number) => max * 1.001,
    },
    tooltip: {
      theme: "dark",
      x: {
        format: "HH:mm:ss",
      },
      y: {
        formatter: (value: number) => formatPrice(value),
      },
      custom: function ({ dataPointIndex }: { dataPointIndex: number }) {
        const data = priceHistory[dataPointIndex];
        if (!data) return "";

        return `
          <div class="bg-gray-800 p-3 rounded-lg border border-gray-600">
            <div class="text-white font-semibold mb-2">ALGO Price</div>
            <div class="text-neutral-400">${data.price.toFixed(6)}</div>
            <div class="text-sm text-gray-300 mt-1">
              Volume: ${formatVolume(data.volume)}
            </div>
            <div class="text-sm text-gray-300">
              Sources: ${data.sources} | Confidence: ${data.confidence.toFixed(
          1
        )}%
            </div>
          </div>
        `;
      },
    },
    legend: {
      show: false,
    },
  };

  const series = [
    {
      name: "ALGO Price",
      data: priceHistory.map((point) => ({
        x: point.timestamp,
        y: point.price,
      })),
    },
  ];

  return (
    <Card className="bg-white/5 backdrop-blur-lg border-white/10">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="text-2xl font-bold text-white flex items-center gap-2">
            <CircleDollarSign className="w-6 h-6 text-blue-400" />
            Advanced Real-Time ALGO Chart
            <Badge
              variant="secondary"
              className="bg-green-500/20 text-green-300 border-green-500/30"
            >
              LIVE
            </Badge>
          </CardTitle>
          <p className="text-gray-400 mt-1">
            Professional trading view • 10-second precision • ApexCharts
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
            <RefreshCcw className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Current Price & Stats */}
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

        {/* Advanced Real-Time Chart */}
        <div className="h-96 w-full">
          {priceHistory.length > 0 ? (
            <Chart
              options={chartOptions}
              series={series}
              type="area"
              height={400}
            />
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-4">
                <ChartLine className="w-12 h-12 text-gray-500 mx-auto animate-pulse" />
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
            collected • ApexCharts powered
          </div>
          <div>
            Last update:{" "}
            {currentData
              ? new Date(currentData.timestamp).toLocaleTimeString()
              : "N/A"}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
