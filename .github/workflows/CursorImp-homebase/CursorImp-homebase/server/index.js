import "dotenv/config";
import cors from "cors";
import express from "express";
import { listProperties } from "./mockDataStore.js";
import { AGENT_PIPELINE, generateIntelReport } from "./agents/orchestrator.js";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: ["http://localhost:3000", "http://localhost:3001"] }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "homebase-server" });
});

app.get("/api/properties", (_req, res) => {
  res.json({ properties: listProperties() });
});

app.get("/api/agents", (_req, res) => {
  res.json({ agents: AGENT_PIPELINE });
});

/** SSE stream for live multi-agent processing dashboard */
app.post("/api/report/stream", async (req, res) => {
  const { address, buyer_profile: buyerProfile } = req.body || {};

  if (!address?.trim()) {
    return res.status(400).json({ error: "address is required" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const send = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const result = await generateIntelReport(
      address.trim(),
      buyerProfile || {},
      (progress) => send("progress", progress)
    );
    send("complete", result);
  } catch (err) {
    send("error", { message: err.message, code: err.code || "ERROR" });
  } finally {
    res.end();
  }
});

/** Synchronous report generation */
app.post("/api/report", async (req, res) => {
  const { address, buyer_profile: buyerProfile } = req.body || {};

  if (!address?.trim()) {
    return res.status(400).json({ error: "address is required" });
  }

  try {
    const result = await generateIntelReport(address.trim(), buyerProfile || {});
    res.json(result);
  } catch (err) {
    const status = err.code === "NOT_FOUND" ? 404 : 500;
    res.status(status).json({ error: err.message, code: err.code });
  }
});

app.listen(PORT, () => {
  console.log(`HomeBase server listening on http://localhost:${PORT}`);
  console.log(
    process.env.ANTHROPIC_API_KEY
      ? "Claude synthesis: enabled"
      : "Claude synthesis: disabled (set ANTHROPIC_API_KEY for LLM summaries)"
  );
});
