"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchDemoProperties, streamReport } from "@/lib/api";
import type { AgentProgress, AppView, BuyerProfile, IntelReport } from "@/lib/types";
import { FinancialProfileDrawer } from "@/components/FinancialProfileDrawer";
import { LandingView } from "@/components/LandingView";
import { ProcessingView } from "@/components/ProcessingView";
import { ReportDashboard } from "@/components/ReportDashboard";

const INITIAL_AGENTS: Record<string, AgentProgress> = {
  spatial: { id: "spatial", status: "WAITING", message: "Waiting…" },
  legal: { id: "legal", status: "WAITING", message: "Waiting…" },
  finance: { id: "finance", status: "WAITING", message: "Waiting…" },
  synthesis: { id: "synthesis", status: "WAITING", message: "Waiting…" },
};

export default function HomePage() {
  const [view, setView] = useState<AppView>("SEARCHING");
  const [address, setAddress] = useState("");
  const [demoAddresses, setDemoAddresses] = useState<string[]>([]);
  const [buyerProfile, setBuyerProfile] = useState<BuyerProfile>({
    first_time_buyer: true,
    household_income: 85000,
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [report, setReport] = useState<IntelReport | null>(null);
  const [agentStates, setAgentStates] = useState(INITIAL_AGENTS);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDemoProperties()
      .then((data) => setDemoAddresses(data.properties.map((p) => p.address)))
      .catch(() =>
        setDemoAddresses([
          "4521 SE Hawthorne Blvd, Portland, OR 97215",
          "2847 SW Patton Rd, Portland, OR 97201",
          "4321 NE Alberta St, Portland, OR 97213",
        ])
      );
  }, []);

  const handleSubmit = useCallback(() => {
    if (!address.trim()) return;
    setError(null);
    setView("PROCESSING");
    setAgentStates(INITIAL_AGENTS);
    setReport(null);

    const cancel = streamReport(address.trim(), buyerProfile, {
      onProgress: (p) => {
        setAgentStates((prev) => ({
          ...prev,
          [p.id]: p,
          ...(p.status === "RUNNING"
            ? Object.fromEntries(
                Object.keys(prev)
                  .filter((k) => k !== p.id && prev[k].status === "WAITING")
                  .map((k) => [k, prev[k]])
              )
            : {}),
        }));
      },
      onComplete: (r) => {
        setReport(r);
        setView("REPORT_READY");
      },
      onError: (msg) => {
        setError(msg);
        setView("SEARCHING");
      },
    });

    return cancel;
  }, [address, buyerProfile]);

  return (
    <>
      {view === "SEARCHING" && (
        <>
          <LandingView
            address={address}
            onAddressChange={setAddress}
            demoAddresses={demoAddresses}
            onOpenProfile={() => setDrawerOpen(true)}
            onSubmit={handleSubmit}
          />
          {error && (
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm max-w-md text-center z-50">
              {error}
            </div>
          )}
        </>
      )}

      {view === "PROCESSING" && (
        <ProcessingView address={address} agentStates={agentStates} />
      )}

      {view === "REPORT_READY" && report && (
        <ReportDashboard
          report={report}
          onNewSearch={() => {
            setView("SEARCHING");
            setReport(null);
            setAgentStates(INITIAL_AGENTS);
          }}
        />
      )}

      <FinancialProfileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        profile={buyerProfile}
        onChange={setBuyerProfile}
      />
    </>
  );
}
