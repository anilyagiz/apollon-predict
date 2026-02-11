"use client";

import { useEffect, useState } from "react";
import { Activity, TrendingUp, TrendingDown } from "lucide-react";

interface PriceData {
  price: number;
  change: number;
  changePercent: number;
  volume?: number;
  timestamp: string;
}

export default function HeroSection() {
  const [priceData, setPriceData] = useState<PriceData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchPrice = async () => {
    try {
      setIsLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(`${apiUrl}/price/near`);

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data || !data.near) {
        throw new Error("No NEAR data received");
      }

      setPriceData({
        price: data.near.usd,
        change: data.near.usd_24h_change || 0,
        changePercent: data.near.usd_24h_change || 0,
        volume: data.near.usd_24h_vol || 0,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Failed to fetch NEAR price:", error);
      setPriceData(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPrice();
    const interval = setInterval(fetchPrice, 30000);
    return () => clearInterval(interval);
  }, []);

  const isPositive = priceData ? priceData.change >= 0 : false;

  return (
    <div className="text-center">
      <h1 className="text-4xl md:text-6xl font-semibold text-white tracking-tight">
        NEAR Oracle
      </h1>

      <p className="mt-4 text-lg text-neutral-400 max-w-2xl mx-auto">
        Zero-knowledge price predictions powered by ML ensemble models
      </p>

      <div className="mt-12 max-w-3xl mx-auto bg-neutral-900 rounded-lg border border-neutral-800 p-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
              <Activity className="w-4 h-4 text-neutral-500" />
              <span className="text-neutral-400 text-sm">NEAR Price</span>
              {isLoading && (
                <div className="w-3 h-3 border border-neutral-600 border-t-white rounded-full animate-spin" />
              )}
            </div>

            {priceData ? (
              <div>
                <div className="text-3xl font-semibold text-white">
                  ${priceData.price.toFixed(2)}
                </div>
                <div className="flex items-center justify-center md:justify-start gap-1 mt-1">
                  {isPositive ? (
                    <TrendingUp className="w-3 h-3 text-neutral-400" />
                  ) : (
                    <TrendingDown className="w-3 h-3 text-neutral-400" />
                  )}
                  <span className="text-sm text-neutral-400">
                    {isPositive ? "+" : ""}
                    {priceData.changePercent.toFixed(2)}%
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-3xl font-semibold text-neutral-600">
                --
              </div>
            )}
          </div>

          <div className="text-center">
            <div className="text-neutral-400 text-sm mb-1">24h Volume</div>
            <div className="text-xl font-medium text-white">
              {priceData?.volume
                ? `$${(priceData.volume / 1000000).toFixed(1)}M`
                : "--"}
            </div>
          </div>

          <div className="text-center">
            <div className="text-neutral-400 text-sm mb-1">Source</div>
            <div className="text-xl font-medium text-white">
              {priceData ? "CoinGecko" : "--"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
