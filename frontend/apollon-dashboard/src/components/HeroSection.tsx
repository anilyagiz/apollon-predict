"use client";

import { useEffect, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Sparkles,
} from "lucide-react";
import { TokenLogo } from "@/components/TokenLogos";

interface TokenPriceData {
  usd: number;
  usd_24h_change: number;
  usd_24h_vol: number;
  usd_market_cap: number;
}

interface TokenConfig {
  id: string;
  name: string;
  symbol: string;
  icon: React.ReactNode;
  accentColor: string;
  decimals: number;
}

const TOKEN_LIST: TokenConfig[] = [
  {
    id: "near",
    name: "NEAR Protocol",
    symbol: "NEAR",
    icon: <TokenLogo tokenId="near" size={20} />,
    accentColor: "blue",
    decimals: 2,
  },
  {
    id: "aurora",
    name: "Aurora",
    symbol: "AURORA",
    icon: <TokenLogo tokenId="aurora" size={20} />,
    accentColor: "emerald",
    decimals: 4,
  },
  {
    id: "ethereum",
    name: "Ethereum",
    symbol: "ETH",
    icon: <TokenLogo tokenId="ethereum" size={20} />,
    accentColor: "indigo",
    decimals: 2,
  },
  {
    id: "solana",
    name: "Solana",
    symbol: "SOL",
    icon: <TokenLogo tokenId="solana" size={20} />,
    accentColor: "violet",
    decimals: 2,
  },
  {
    id: "algorand",
    name: "Algorand",
    symbol: "ALGO",
    icon: <TokenLogo tokenId="algorand" size={20} />,
    accentColor: "teal",
    decimals: 4,
  },
];

export default function HeroSection() {
  const [tokenPrices, setTokenPrices] = useState<Record<string, TokenPriceData>>({});
  const [isLoading, setIsLoading] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const fetchAllPrices = async () => {
    try {
      setIsLoading(true);
      const resp = await fetch(`${apiUrl}/price/tokens`);
      if (resp.ok) {
        const data = await resp.json();
        if (data?.tokens) {
          setTokenPrices(data.tokens);
        }
      }
    } catch (error) {
      console.error("Failed to fetch token prices:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllPrices();
    const interval = setInterval(fetchAllPrices, 30000);
    return () => clearInterval(interval);
  }, [fetchAllPrices]);

  const formatVol = (v?: number) => {
    if (!v) return "--";
    if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
    if (v >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
    return `$${(v / 1e3).toFixed(0)}K`;
  };

  return (
    <div className="text-center pt-8 pb-4">
      {/* Tagline */}
      <div className="flex items-center justify-center gap-2 mb-6">
        <span className="pyth-badge flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5" />
          Zero-Knowledge Price Oracle
        </span>
      </div>

      {/* Main Headline */}
      <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.05]">
        <span className="text-white">The Price of </span>
        <span className="pyth-gradient-text">Everything.</span>
        <br />
        <span className="text-white">Proven </span>
        <span className="pyth-gradient-text">Privately.</span>
      </h1>

      <p className="mt-6 text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
        ML ensemble predictions with ZK-SNARK privacy. Multi-chain oracle
        covering NEAR, Aurora, Ethereum, Solana &amp; Algorand.
      </p>

      {/* Live Price Cards — scrollable row on small screens, grid on larger */}
      <div className="mt-14 max-w-6xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {TOKEN_LIST.map((token) => {
            const priceData = tokenPrices[token.id];
            return (
              <PriceCard
                key={token.id}
                token={token}
                priceData={priceData || null}
                isLoading={isLoading}
                formatVol={formatVol}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ========================================================================= */

const ACCENT_STYLES: Record<string, { border: string; bg: string }> = {
  blue: {
    border: "border-blue-500/15 hover:border-blue-500/30",
    bg: "bg-blue-500/10",
  },
  emerald: {
    border: "border-emerald-500/15 hover:border-emerald-500/30",
    bg: "bg-emerald-500/10",
  },
  indigo: {
    border: "border-indigo-500/15 hover:border-indigo-500/30",
    bg: "bg-indigo-500/10",
  },
  violet: {
    border: "border-violet-500/15 hover:border-violet-500/30",
    bg: "bg-violet-500/10",
  },
  teal: {
    border: "border-teal-500/15 hover:border-teal-500/30",
    bg: "bg-teal-500/10",
  },
};

function PriceCard({
  token,
  priceData,
  isLoading,
  formatVol,
}: {
  token: TokenConfig;
  priceData: TokenPriceData | null;
  isLoading: boolean;
  formatVol: (v?: number) => string;
}) {
  const isPositive = priceData ? priceData.usd_24h_change >= 0 : true;
  const style = ACCENT_STYLES[token.accentColor] || ACCENT_STYLES.blue;

  return (
    <div className={`pyth-card ${style.border} p-4 text-left transition-all`}>
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${style.bg}`}>
          {token.icon}
        </div>
        <div className="min-w-0">
          <div className="text-white font-semibold text-xs truncate">{token.name}</div>
          <div className="text-gray-500 text-[10px] font-mono">{token.symbol} / USD</div>
        </div>
      </div>

      {/* Price */}
      <div className="pyth-stat-number text-2xl font-mono mb-2">
        {priceData ? `$${priceData.usd.toFixed(token.decimals)}` : "--"}
      </div>

      {/* Change + Volume */}
      <div className="flex items-center justify-between">
        {priceData ? (
          <span
            className={`text-[11px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-0.5 ${
              isPositive
                ? "bg-emerald-500/10 text-emerald-400"
                : "bg-red-500/10 text-red-400"
            }`}
          >
            {isPositive ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {isPositive ? "+" : ""}
            {priceData.usd_24h_change.toFixed(2)}%
          </span>
        ) : (
          <span className="text-gray-600 text-[11px]">--</span>
        )}
        <div className="text-[10px] text-gray-500 font-mono">
          {formatVol(priceData?.usd_24h_vol)}
        </div>
      </div>

      {isLoading && (
        <div className="mt-2 flex justify-center">
          <div className="w-3 h-3 border-2 border-purple-500/30 border-t-purple-400 rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
