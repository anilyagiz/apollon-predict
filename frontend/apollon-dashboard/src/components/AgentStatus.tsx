"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, Shield, Activity, Clock } from "lucide-react";

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

  const statusColor = {
    running: "bg-green-500/20 text-green-300 border-green-500/30",
    stopped: "bg-gray-500/20 text-gray-300 border-gray-500/30",
    disabled: "bg-gray-500/20 text-gray-300 border-gray-500/30",
    unreachable: "bg-red-500/20 text-red-300 border-red-500/30",
    not_initialized: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  };

  if (loading) return null;

  return (
    <Card className="bg-white/5 backdrop-blur-lg border-white/10">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-bold text-white flex items-center gap-2">
          <Bot className="w-5 h-5 text-purple-400" />
          Oracle Agent
          <Badge
            variant="secondary"
            className={
              statusColor[
                (agent?.status as keyof typeof statusColor) || "disabled"
              ] || statusColor.disabled
            }
          >
            {agent?.status || "disabled"}
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/5 rounded-lg p-3">
            <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
              <Activity className="w-3 h-3" />
              Predictions Fulfilled
            </div>
            <p className="text-2xl font-bold text-white">
              {agent?.total_fulfilled || 0}
            </p>
          </div>

          <div className="bg-white/5 rounded-lg p-3">
            <div className="flex items-center gap-2 text-gray-400 text-xs mb-1">
              <Shield className="w-3 h-3" />
              TEE Status
            </div>
            <p className="text-sm font-medium text-white">
              {agent?.tee_attestation ? "Attested" : "Development"}
            </p>
          </div>
        </div>

        {/* Chains */}
        {agent?.chains && agent.chains.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Chains:</span>
            {agent.chains.map((chain) => (
              <Badge
                key={chain}
                variant="secondary"
                className="bg-white/5 text-gray-300 text-xs"
              >
                {chain}
              </Badge>
            ))}
          </div>
        )}

        {/* Last fulfillment */}
        {agent?.last_fulfillment && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Clock className="w-3 h-3" />
            Last fulfilled: {new Date(agent.last_fulfillment).toLocaleString()}
          </div>
        )}

        {!agent?.enabled && (
          <p className="text-xs text-gray-500 italic">
            Shade Agent is not enabled. Set SHADE_AGENT_ENABLED=true to activate.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
