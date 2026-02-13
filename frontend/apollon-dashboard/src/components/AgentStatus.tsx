"use client";

import { useState, useEffect } from "react";
import { BrainCog, ShieldCheck, Activity, Clock } from "lucide-react";

interface AgentData {
  enabled: boolean;
  agent_id: string;
  status: string;
  last_fulfillment: string | null;
  total_fulfilled: number;
  tee_attestation: string | null;
  chains?: string[];
  timestamp: string;
}

export default function AgentStatus() {
  const [agent, setAgent] = useState<AgentData | null>(null);
  const [loading, setLoading] = useState(true);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const resp = await fetch(`${apiUrl}/agent/status`);
        if (resp.ok) {
          setAgent(await resp.json());
        }
      } catch (err) {
        console.error("Failed to fetch agent status:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, [apiUrl]);

  const statusColor: Record<string, string> = {
    running: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    stopped: "bg-gray-500/10 text-gray-400 border-gray-500/20",
    disabled: "bg-gray-500/10 text-gray-400 border-gray-500/20",
    unreachable: "bg-red-500/10 text-red-400 border-red-500/20",
    not_initialized: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  };

  if (loading) return null;

  const statusKey = agent?.status || "disabled";

  return (
    <div className="pyth-card p-6">
      <div className="flex items-center gap-2 mb-5">
        <BrainCog className="w-5 h-5 text-purple-400" />
        <h3 className="text-base font-bold text-white">Oracle Agent</h3>
        <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ml-auto ${statusColor[statusKey] || statusColor.disabled}`}>
          {statusKey}
        </span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-white/[0.02] border border-purple-500/8 p-3">
          <div className="flex items-center gap-1.5 text-gray-500 text-[11px] mb-1 font-medium">
            <Activity className="w-3 h-3" />
            Predictions Fulfilled
          </div>
          <p className="pyth-stat-number text-2xl">
            {agent?.total_fulfilled || 0}
          </p>
        </div>

        <div className="rounded-xl bg-white/[0.02] border border-purple-500/8 p-3">
          <div className="flex items-center gap-1.5 text-gray-500 text-[11px] mb-1 font-medium">
            <ShieldCheck className="w-3 h-3" />
            TEE Status
          </div>
          <p className="text-sm font-semibold text-purple-200 mt-1">
            {agent?.tee_attestation ? "Attested" : "Development"}
          </p>
        </div>
      </div>

      {/* Chains */}
      {agent?.chains && agent.chains.length > 0 && (
        <div className="flex items-center gap-2 mt-4">
          <span className="text-[11px] text-gray-500 font-medium">Chains:</span>
          {agent.chains.map((chain) => (
            <span
              key={chain}
              className="text-[11px] px-2 py-0.5 rounded-md bg-purple-500/8 text-purple-300 border border-purple-500/10 font-medium"
            >
              {chain}
            </span>
          ))}
        </div>
      )}

      {/* Last fulfillment */}
      {agent?.last_fulfillment && (
        <div className="flex items-center gap-2 mt-3 text-[11px] text-gray-600">
          <Clock className="w-3 h-3" />
          Last fulfilled: {new Date(agent.last_fulfillment).toLocaleString()}
        </div>
      )}

      {!agent?.enabled && (
        <p className="text-[11px] text-gray-600 mt-3 italic">
          Shade Agent is not enabled. Set SHADE_AGENT_ENABLED=true to activate.
        </p>
      )}
    </div>
  );
}
