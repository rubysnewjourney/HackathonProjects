import type { AgentProgress, BuyerProfile, IntelReport } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export async function fetchDemoProperties() {
  const res = await fetch(`${API_BASE}/api/properties`);
  if (!res.ok) throw new Error("Failed to load demo properties");
  return res.json() as Promise<{
    properties: { id: string; address: string; profile: string; list_price: number }[];
  }>;
}

export async function generateReport(address: string, buyerProfile: BuyerProfile) {
  const res = await fetch(`${API_BASE}/api/report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address, buyer_profile: buyerProfile }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Report generation failed");
  return data as { report: IntelReport };
}

export function streamReport(
  address: string,
  buyerProfile: BuyerProfile,
  callbacks: {
    onProgress: (p: AgentProgress) => void;
    onComplete: (report: IntelReport) => void;
    onError: (message: string) => void;
  }
) {
  const controller = new AbortController();

  fetch(`${API_BASE}/api/report/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address, buyer_profile: buyerProfile }),
    signal: controller.signal,
  })
    .then(async (res) => {
      if (!res.ok || !res.body) {
        throw new Error("Stream connection failed");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() || "";

        for (const chunk of chunks) {
          const lines = chunk.split("\n");
          let event = "message";
          let data = "";
          for (const line of lines) {
            if (line.startsWith("event: ")) event = line.slice(7);
            if (line.startsWith("data: ")) data = line.slice(6);
          }
          if (!data) continue;
          const parsed = JSON.parse(data);
          if (event === "progress") {
            callbacks.onProgress({
              id: parsed.id,
              status: parsed.status === "RUNNING" ? "RUNNING" : parsed.status === "COMPLETED" ? "COMPLETED" : "WAITING",
              message: parsed.message,
            });
          } else if (event === "complete") {
            callbacks.onComplete(parsed.report);
          } else if (event === "error") {
            callbacks.onError(parsed.message);
          }
        }
      }
    })
    .catch((err) => {
      if (err.name !== "AbortError") callbacks.onError(err.message);
    });

  return () => controller.abort();
}
