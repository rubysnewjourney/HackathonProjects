"use client";

import type { AgentProgress, AgentStatus } from "@/lib/types";

const AGENT_META: Record<string, { icon: string; label: string }> = {
  spatial: { icon: "📡", label: "Spatial Hazard Agent" },
  legal: { icon: "📜", label: "Legal History Agent" },
  finance: { icon: "💰", label: "Finance Agent" },
  synthesis: { icon: "🎯", label: "Synthesis & Evaluation Agent" },
};

const ORDER = ["spatial", "legal", "finance", "synthesis"];

function StatusBadge({ status }: { status: AgentStatus }) {
  const styles: Record<AgentStatus, string> = {
    WAITING: "bg-slate-200 text-slate-600",
    RUNNING: "bg-amber-100 text-amber-800 animate-pulse-ring",
    COMPLETED: "bg-emerald-100 text-emerald-800",
  };
  return (
    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${styles[status]}`}>
      {status}
    </span>
  );
}

interface Props {
  address: string;
  agentStates: Record<string, AgentProgress>;
}

export function ProcessingView({ address, agentStates }: Props) {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-b from-slate-100 to-portland-fog">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
        <h2 className="text-xl font-semibold text-portland-river mb-1">Running multi-agent pipeline</h2>
        <p className="text-sm text-slate-600 mb-6 truncate">{address}</p>

        <ul className="space-y-4">
          {ORDER.map((id) => {
            const meta = AGENT_META[id];
            const state = agentStates[id] || {
              id,
              status: "WAITING" as AgentStatus,
              message: "Waiting…",
            };
            return (
              <li
                key={id}
                className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100"
              >
                <span className="text-2xl" aria-hidden>
                  {meta.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-slate-800 text-sm">{meta.label}</span>
                    <StatusBadge status={state.status} />
                  </div>
                  <p className="text-xs text-slate-500 mt-1 truncate">{state.message}</p>
                </div>
                {state.status === "RUNNING" && (
                  <span className="inline-block h-5 w-5 border-2 border-portland-moss border-t-transparent rounded-full animate-spin" />
                )}
                {state.status === "COMPLETED" && (
                  <span className="text-emerald-600 text-lg" aria-label="Completed">
                    ✓
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

