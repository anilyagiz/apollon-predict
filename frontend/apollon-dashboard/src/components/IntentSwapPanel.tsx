"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Loader2,
  CheckCircle2,
  Copy,
  Clock,
  ArrowRight,
} from "lucide-react";

type PaymentStatus = "idle" | "quoting" | "quoted" | "executing" | "pending" | "success" | "failed";

export default function IntentSwapPanel() {
  const [originAsset, setOriginAsset] = useState("");
  const [amount, setAmount] = useState("");
  const [refundAddress, setRefundAddress] = useState("");
  const [status, setStatus] = useState<PaymentStatus>("idle");
  const [quote, setQuote] = useState<any>(null);
  const [depositAddress, setDepositAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const publisherContract =
    process.env.NEXT_PUBLIC_PUBLISHER_CONTRACT || "apollon-publisher.testnet";

  const POPULAR_ASSETS = [
    { id: "nep141:wrap.near", label: "wNEAR", chain: "NEAR" },
    { id: "nep141:usdt.tether-token.near", label: "USDT", chain: "NEAR" },
    { id: "nep141:eth-0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.omft.near", label: "USDC (ETH)", chain: "Ethereum" },
    { id: "nep141:sol-es9vmfrzacermjfrf4h2fyd4kconky11mcce8benwnyb.omft.near", label: "USDT (SOL)", chain: "Solana" },
  ];

  const getQuote = async () => {
    if (!originAsset || !amount || !refundAddress) {
      setError("Please fill in all fields");
      return;
    }

    setStatus("quoting");
    setError(null);

    try {
      const resp = await fetch(`${apiUrl}/intents/prediction/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin_asset: originAsset,
          amount,
          recipient_near_account: publisherContract,
          refund_to: refundAddress,
        }),
      });

      if (!resp.ok) throw new Error(`Quote failed: ${resp.status}`);
      const data = await resp.json();
      setQuote(data);
      setStatus("quoted");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Quote failed");
      setStatus("idle");
    }
  };

  const executePay = async () => {
    setStatus("executing");
    setError(null);

    try {
      const resp = await fetch(`${apiUrl}/intents/prediction/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin_asset: originAsset,
          amount,
          recipient_near_account: publisherContract,
          refund_to: refundAddress,
        }),
      });

      if (!resp.ok) throw new Error(`Payment failed: ${resp.status}`);
      const data = await resp.json();

      const addr = data.quote?.depositAddress;
      if (addr) {
        setDepositAddress(addr);
        setStatus("pending");
      } else {
        throw new Error("No deposit address returned");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
      setStatus("idle");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="pyth-card p-6">
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="w-5 h-5 text-purple-400" />
          <h3 className="text-base font-bold text-white">Pay for Prediction</h3>
          <span className="pyth-badge text-[10px]">Cross-Chain</span>
        </div>
        <p className="text-gray-500 text-sm ml-7">
          Pay for oracle predictions from any chain via NEAR Intents
        </p>
      </div>

      <div className="space-y-4">
        {/* Quick select popular assets */}
        <div className="flex flex-wrap gap-2">
          {POPULAR_ASSETS.map((asset) => (
            <button
              key={asset.id}
              onClick={() => setOriginAsset(asset.id)}
              className={`px-3 py-1 rounded-full text-xs border transition-colors ${
                originAsset === asset.id
                  ? "bg-blue-500/20 border-blue-500/30 text-blue-300"
                  : "bg-white/5 border-white/10 text-gray-400 hover:border-white/20"
              }`}
            >
              {asset.label}
              <span className="text-gray-500 ml-1">({asset.chain})</span>
            </button>
          ))}
        </div>

        {/* Or enter custom asset ID */}
        <input
          type="text"
          value={originAsset}
          onChange={(e) => setOriginAsset(e.target.value)}
          placeholder="Asset ID (e.g. nep141:wrap.near)"
          className="w-full bg-white/[0.03] border border-purple-500/10 rounded-xl px-3 py-2.5 text-white placeholder-gray-600 text-sm font-mono focus:border-purple-500/30 focus:outline-none transition-colors"
        />

        <div className="grid grid-cols-2 gap-3">
          <input
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount"
            className="bg-white/[0.03] border border-purple-500/10 rounded-xl px-3 py-2.5 text-white placeholder-gray-600 text-sm font-mono focus:border-purple-500/30 focus:outline-none transition-colors"
          />
          <input
            type="text"
            value={refundAddress}
            onChange={(e) => setRefundAddress(e.target.value)}
            placeholder="Refund address"
            className="bg-white/[0.03] border border-purple-500/10 rounded-xl px-3 py-2.5 text-white placeholder-gray-600 text-sm font-mono focus:border-purple-500/30 focus:outline-none transition-colors"
          />
        </div>

        {/* Destination info */}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <ArrowRight className="w-3 h-3" />
          Payment goes to{" "}
          <code className="bg-white/5 px-1 rounded">{publisherContract}</code>
          as wNEAR
        </div>

        {/* Error */}
        {error && (
          <p className="text-red-300 text-sm bg-red-500/10 rounded px-3 py-2">
            {error}
          </p>
        )}

        {/* Quote result */}
        {quote?.quote && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-white/5 rounded-lg p-3 space-y-1 text-sm"
          >
            <div className="flex justify-between">
              <span className="text-gray-400">You pay</span>
              <span className="text-white font-mono">
                {quote.quote.amountInFormatted}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Oracle receives</span>
              <span className="text-white font-mono">
                {quote.quote.amountOutFormatted} wNEAR
              </span>
            </div>
            {quote.quote.timeEstimate && (
              <div className="flex justify-between">
                <span className="text-gray-400">Time</span>
                <span className="text-gray-300 flex items-center gap-1">
                  <Clock className="w-3 h-3" />~{quote.quote.timeEstimate}s
                </span>
              </div>
            )}
          </motion.div>
        )}

        {/* Deposit address */}
        {depositAddress && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 space-y-2"
          >
            <p className="text-xs text-yellow-300 font-medium">
              Send payment to:
            </p>
            <div className="flex items-center gap-2">
              <code className="text-xs text-white bg-black/30 px-2 py-1 rounded flex-1 break-all">
                {depositAddress}
              </code>
              <button
                onClick={() => copyToClipboard(depositAddress)}
                className="text-yellow-300 hover:text-yellow-200"
              >
                {copied ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </motion.div>
        )}

        {/* Action button */}
        {status === "idle" && (
          <Button
            onClick={getQuote}
            className="w-full pyth-btn-primary"
            disabled={!originAsset || !amount || !refundAddress}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Get Payment Quote
          </Button>
        )}

        {status === "quoting" && (
          <Button disabled className="w-full">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Getting quote...
          </Button>
        )}

        {status === "quoted" && (
          <Button
            onClick={executePay}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/10"
          >
            Confirm Payment
          </Button>
        )}

        {status === "executing" && (
          <Button disabled className="w-full">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Processing...
          </Button>
        )}

        {status === "pending" && (
          <div className="flex items-center gap-2 text-yellow-300 text-sm justify-center">
            <Loader2 className="w-4 h-4 animate-spin" />
            Waiting for deposit...
          </div>
        )}

        {status === "success" && (
          <div className="flex items-center gap-2 text-green-300 text-sm justify-center">
            <CheckCircle2 className="w-4 h-4" />
            Payment received! Prediction will be generated.
          </div>
        )}
      </div>
    </div>
  );
}
