"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowDownUp,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Copy,
  ExternalLink,
  RefreshCw,
} from "lucide-react";

interface Token {
  assetId: string;
  symbol: string;
  blockchain: string;
  decimals: number;
  price?: string;
}

interface Chain {
  id: string;
  name: string;
  icon: string;
  type: string;
  is_primary: boolean;
}

interface QuoteData {
  quote?: {
    depositAddress?: string;
    amountIn?: string;
    amountInFormatted?: string;
    amountOut?: string;
    amountOutFormatted?: string;
    amountOutUsd?: string;
    timeEstimate?: number;
  };
}

type SwapStatus =
  | "idle"
  | "quoting"
  | "quoted"
  | "executing"
  | "pending_deposit"
  | "processing"
  | "success"
  | "failed";

export default function TokenSwap() {
  const [chains, setChains] = useState<Chain[]>([]);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [sourceChain, setSourceChain] = useState("near");
  const [destChain, setDestChain] = useState("solana");
  const [sourceToken, setSourceToken] = useState("");
  const [destToken, setDestToken] = useState("");
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [depositAddress, setDepositAddress] = useState("");
  const [swapStatus, setSwapStatus] = useState<SwapStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const apiUrl =
    typeof window !== "undefined"
      ? process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
      : "http://localhost:8000";

  // Fetch supported chains on mount
  useEffect(() => {
    fetchChains();
  }, []);

  // Fetch tokens when chain changes
  useEffect(() => {
    if (sourceChain) fetchTokens(sourceChain, "source");
  }, [sourceChain]);

  useEffect(() => {
    if (destChain) fetchTokens(destChain, "dest");
  }, [destChain]);

  const fetchChains = async () => {
    try {
      const resp = await fetch(`${apiUrl}/swap/chains`);
      if (resp.ok) {
        const data = await resp.json();
        setChains(data.chains || []);
      }
    } catch (err) {
      console.error("Failed to fetch chains:", err);
    }
  };

  const fetchTokens = async (chain: string, _side: "source" | "dest") => {
    try {
      const resp = await fetch(`${apiUrl}/swap/tokens?chain=${chain}`);
      if (resp.ok) {
        const data = await resp.json();
        setTokens((prev) => {
          const filtered = prev.filter(
            (t) => t.blockchain.toLowerCase() !== chain.toLowerCase()
          );
          return [...filtered, ...(data.tokens || [])];
        });
      }
    } catch (err) {
      console.error("Failed to fetch tokens:", err);
    }
  };

  const getQuote = useCallback(async () => {
    if (!sourceToken || !destToken || !amount || !recipient) {
      setError("Please fill in all fields");
      return;
    }

    setSwapStatus("quoting");
    setError(null);

    try {
      const resp = await fetch(`${apiUrl}/swap/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin_asset: sourceToken,
          destination_asset: destToken,
          amount,
          recipient,
          dry: true,
        }),
      });

      if (!resp.ok) throw new Error(`Quote failed: ${resp.status}`);
      const data = await resp.json();
      setQuote(data);
      setSwapStatus("quoted");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Quote failed");
      setSwapStatus("idle");
    }
  }, [sourceToken, destToken, amount, recipient, apiUrl]);

  const executeSwap = async () => {
    if (!sourceToken || !destToken || !amount || !recipient) return;

    setSwapStatus("executing");
    setError(null);

    try {
      const resp = await fetch(`${apiUrl}/swap/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin_asset: sourceToken,
          destination_asset: destToken,
          amount,
          recipient,
        }),
      });

      if (!resp.ok) throw new Error(`Execution failed: ${resp.status}`);
      const data = await resp.json();

      const addr = data.quote?.depositAddress;
      if (addr) {
        setDepositAddress(addr);
        setSwapStatus("pending_deposit");
      } else {
        throw new Error("No deposit address returned");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Swap failed");
      setSwapStatus("idle");
    }
  };

  const checkStatus = async () => {
    if (!depositAddress) return;

    try {
      const resp = await fetch(`${apiUrl}/swap/status/${depositAddress}`);
      if (resp.ok) {
        const data = await resp.json();
        const status = data.status?.toUpperCase();

        if (status === "SUCCESS") setSwapStatus("success");
        else if (status === "FAILED" || status === "REFUNDED")
          setSwapStatus("failed");
        else if (status === "PROCESSING") setSwapStatus("processing");
      }
    } catch (err) {
      console.error("Status check failed:", err);
    }
  };

  // Poll status when waiting
  useEffect(() => {
    if (
      swapStatus !== "pending_deposit" &&
      swapStatus !== "processing"
    )
      return;

    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, [swapStatus, depositAddress]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const swapChains = () => {
    setSourceChain(destChain);
    setDestChain(sourceChain);
    setSourceToken("");
    setDestToken("");
    setQuote(null);
    setSwapStatus("idle");
  };

  const resetSwap = () => {
    setQuote(null);
    setDepositAddress("");
    setSwapStatus("idle");
    setError(null);
    setAmount("");
  };

  const sourceTokens = tokens.filter(
    (t) => t.blockchain?.toLowerCase() === sourceChain
  );
  const destTokens = tokens.filter(
    (t) => t.blockchain?.toLowerCase() === destChain
  );

  return (
    <Card className="bg-white/5 backdrop-blur-lg border-white/10">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-white flex items-center gap-2">
          <ArrowDownUp className="w-6 h-6 text-blue-400" />
          Token Swap
          <Badge
            variant="secondary"
            className="bg-blue-500/20 text-blue-300 border-blue-500/30"
          >
            NEAR Intents
          </Badge>
        </CardTitle>
        <p className="text-gray-400 mt-1">
          Cross-chain swap powered by NEAR Intents - 14+ chains supported
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Source Chain + Token */}
        <div className="space-y-3">
          <label className="text-sm text-gray-400">From</label>
          <div className="flex gap-3">
            <select
              value={sourceChain}
              onChange={(e) => {
                setSourceChain(e.target.value);
                setSourceToken("");
                setQuote(null);
              }}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm flex-1"
            >
              {chains.map((c) => (
                <option key={c.id} value={c.id} className="bg-neutral-900">
                  {c.name}
                </option>
              ))}
              {chains.length === 0 && (
                <>
                  <option value="near" className="bg-neutral-900">NEAR</option>
                  <option value="solana" className="bg-neutral-900">Solana</option>
                  <option value="ethereum" className="bg-neutral-900">Ethereum</option>
                </>
              )}
            </select>

            <select
              value={sourceToken}
              onChange={(e) => {
                setSourceToken(e.target.value);
                setQuote(null);
              }}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm flex-1"
            >
              <option value="" className="bg-neutral-900">
                Select token
              </option>
              {sourceTokens.map((t) => (
                <option
                  key={t.assetId}
                  value={t.assetId}
                  className="bg-neutral-900"
                >
                  {t.symbol} {t.price ? `($${t.price})` : ""}
                </option>
              ))}
            </select>
          </div>

          <input
            type="text"
            value={amount}
            onChange={(e) => {
              setAmount(e.target.value);
              setQuote(null);
            }}
            placeholder="Amount (in smallest unit)"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 text-lg font-mono"
          />
        </div>

        {/* Swap direction button */}
        <div className="flex justify-center">
          <Button
            onClick={swapChains}
            variant="outline"
            size="sm"
            className="border-white/20 text-white hover:bg-white/10 rounded-full w-10 h-10 p-0"
          >
            <ArrowDownUp className="w-4 h-4" />
          </Button>
        </div>

        {/* Destination Chain + Token */}
        <div className="space-y-3">
          <label className="text-sm text-gray-400">To</label>
          <div className="flex gap-3">
            <select
              value={destChain}
              onChange={(e) => {
                setDestChain(e.target.value);
                setDestToken("");
                setQuote(null);
              }}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm flex-1"
            >
              {chains.map((c) => (
                <option key={c.id} value={c.id} className="bg-neutral-900">
                  {c.name}
                </option>
              ))}
              {chains.length === 0 && (
                <>
                  <option value="near" className="bg-neutral-900">NEAR</option>
                  <option value="solana" className="bg-neutral-900">Solana</option>
                  <option value="ethereum" className="bg-neutral-900">Ethereum</option>
                </>
              )}
            </select>

            <select
              value={destToken}
              onChange={(e) => {
                setDestToken(e.target.value);
                setQuote(null);
              }}
              className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm flex-1"
            >
              <option value="" className="bg-neutral-900">
                Select token
              </option>
              {destTokens.map((t) => (
                <option
                  key={t.assetId}
                  value={t.assetId}
                  className="bg-neutral-900"
                >
                  {t.symbol} {t.price ? `($${t.price})` : ""}
                </option>
              ))}
            </select>
          </div>

          <input
            type="text"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="Recipient address"
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 text-sm font-mono"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-3">
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        )}

        {/* Quote Display */}
        {quote?.quote && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 rounded-lg p-4 space-y-2"
          >
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">You send</span>
              <span className="text-white font-mono">
                {quote.quote.amountInFormatted || amount}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">You receive</span>
              <span className="text-white font-mono">
                {quote.quote.amountOutFormatted || "—"}
              </span>
            </div>
            {quote.quote.amountOutUsd && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Value</span>
                <span className="text-gray-300">
                  ~${quote.quote.amountOutUsd}
                </span>
              </div>
            )}
            {quote.quote.timeEstimate && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Estimated time</span>
                <span className="text-gray-300 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  ~{quote.quote.timeEstimate}s
                </span>
              </div>
            )}
          </motion.div>
        )}

        {/* Deposit Address */}
        {depositAddress && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 space-y-3"
          >
            <p className="text-sm text-blue-300 font-medium">
              Send tokens to this deposit address:
            </p>
            <div className="flex items-center gap-2">
              <code className="text-xs text-white bg-black/30 px-3 py-2 rounded flex-1 break-all">
                {depositAddress}
              </code>
              <Button
                onClick={() => copyToClipboard(depositAddress)}
                variant="outline"
                size="sm"
                className="border-blue-500/30 text-blue-300 hover:bg-blue-500/10"
              >
                {copied ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </motion.div>
        )}

        {/* Status Indicator */}
        {(swapStatus === "pending_deposit" ||
          swapStatus === "processing" ||
          swapStatus === "success" ||
          swapStatus === "failed") && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
            {swapStatus === "pending_deposit" && (
              <>
                <Clock className="w-5 h-5 text-yellow-400 animate-pulse" />
                <span className="text-yellow-300 text-sm">
                  Waiting for deposit...
                </span>
              </>
            )}
            {swapStatus === "processing" && (
              <>
                <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                <span className="text-blue-300 text-sm">
                  Processing swap...
                </span>
              </>
            )}
            {swapStatus === "success" && (
              <>
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                <span className="text-green-300 text-sm">Swap complete!</span>
              </>
            )}
            {swapStatus === "failed" && (
              <>
                <XCircle className="w-5 h-5 text-red-400" />
                <span className="text-red-300 text-sm">
                  Swap failed / refunded
                </span>
              </>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          {swapStatus === "idle" && (
            <Button
              onClick={getQuote}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              disabled={!sourceToken || !destToken || !amount || !recipient}
            >
              Get Quote
            </Button>
          )}

          {swapStatus === "quoting" && (
            <Button disabled className="flex-1">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Getting quote...
            </Button>
          )}

          {swapStatus === "quoted" && (
            <Button
              onClick={executeSwap}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              Execute Swap
            </Button>
          )}

          {swapStatus === "executing" && (
            <Button disabled className="flex-1">
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Executing...
            </Button>
          )}

          {(swapStatus === "success" || swapStatus === "failed") && (
            <Button
              onClick={resetSwap}
              className="flex-1 bg-white/10 hover:bg-white/20 text-white"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              New Swap
            </Button>
          )}

          {swapStatus !== "idle" && swapStatus !== "quoting" && (
            <Button
              onClick={getQuote}
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Footer */}
        <div className="text-xs text-gray-500 flex items-center gap-1 justify-center">
          Powered by NEAR Intents 1Click API
          <ExternalLink className="w-3 h-3" />
        </div>
      </CardContent>
    </Card>
  );
}
