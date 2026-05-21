import dotenv from "dotenv";
import cors from "cors";
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { analyzeSiteImage, AGENT_PIPELINE } from "./agents/orchestrator.js";
import { generateAiScenario } from "./agents/scenarioAgent.js";
import { STOCK_IMAGES, pickRandomStock } from "./data/stockImages.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });
dotenv.config({ path: path.join(__dirname, ".env") });
const PUBLIC_DIR = path.join(__dirname, "..", "public");
const PORT = process.env.HAZARD_SPOTTER_PORT || 4100;

const app = express();
app.use(cors());
app.use(express.json({ limit: "15mb" }));
app.use(express.static(PUBLIC_DIR));

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "site-hazard-spotter",
    claude: Boolean(process.env.ANTHROPIC_API_KEY),
    base_url: process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com",
  });
});

app.get("/api/agents", (_req, res) => {
  res.json({ agents: AGENT_PIPELINE });
});

app.get("/api/stock-images", (_req, res) => {
  res.json({ images: STOCK_IMAGES });
});

app.get("/api/random-site", (_req, res) => {
  const site = pickRandomStock();
  res.json({ site });
});

app.post("/api/generate-scenario", async (_req, res) => {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return res.status(503).json({
        error: "ANTHROPIC_API_KEY required for AI scenario generation",
      });
    }
    const scenario = await generateAiScenario();
    res.json(scenario);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/analyze/stream", async (req, res) => {
  const { imageUrl, stockId, useFallback } = req.body || {};
  if (!imageUrl) {
    return res.status(400).json({ error: "imageUrl is required" });
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  const send = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  try {
    const report = await analyzeSiteImage(
      { imageUrl, stockId, useFallback: Boolean(useFallback) },
      (progress) => send("progress", progress)
    );
    send("complete", { ...report, imageUrl, stockId });
  } catch (err) {
    send("error", {
      message: err.message,
      code: err.code || "ERROR",
    });
  } finally {
    res.end();
  }
});

app.post("/api/analyze", async (req, res) => {
  const { imageUrl, stockId, useFallback } = req.body || {};
  if (!imageUrl) {
    return res.status(400).json({ error: "imageUrl is required" });
  }
  try {
    const report = await analyzeSiteImage({
      imageUrl,
      stockId,
      useFallback: Boolean(useFallback),
    });
    res.json({ ...report, imageUrl, stockId });
  } catch (err) {
    const status = err.code === "NO_API_KEY" ? 503 : 500;
    res.status(status).json({ error: err.message, code: err.code });
  }
});

app.get("*", (_req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Site Hazard Spotter → http://localhost:${PORT}`);
  console.log(
    process.env.ANTHROPIC_API_KEY
      ? "Multi-agent Claude pipeline: enabled"
      : "Claude: disabled — set ANTHROPIC_API_KEY in hazard-spotter/.env"
  );
});
