import Anthropic from "@anthropic-ai/sdk";
import { findPropertyByAddress } from "../mockDataStore.js";
import { runSpatialAgent } from "./spatialAgent.js";
import { runLegalAgent } from "./legalAgent.js";
import { runFinanceAgent } from "./financeAgent.js";
import { buildIntelReport } from "./scorer.js";

const CORE_SYSTEM_PROMPT = `You are HomeBase Core Controller, an orchestration layer for first-time homebuyers in the Portland Metro Area (Multnomah, Washington, Clackamas counties).

Your role is to synthesize outputs from three specialized agents:
1. Spatial Hazard Agent — DOGAMI, FEMA, EPA, Oregon State Fire Marshal data
2. Legal & Permit History Agent — Portland BDS, county assessor, Oregon SOS liens
3. Local Finance & Assistance Agent — OHCS programs, DPA grants, property tax millage

Given structured agent JSON, produce a concise executive summary (3–5 sentences) highlighting the top risks, financial picture, and recommended next steps for a first-time buyer. Be direct and plain-language. Do not invent facts beyond the provided data.`;

export const AGENT_PIPELINE = [
  { id: "spatial", name: "Spatial Hazard Agent", icon: "📡", startMessage: "Querying DOGAMI Seismology Arrays..." },
  { id: "legal", name: "Legal History Agent", icon: "📜", startMessage: "Auditing Portland BDS Permit Logs..." },
  { id: "finance", name: "Finance Agent", icon: "💰", startMessage: "Cross-referencing OHCS Grant Requirements..." },
  { id: "synthesis", name: "Synthesis & Evaluation Agent", icon: "🎯", startMessage: "Computing risk score and unified intel report..." },
];

export async function resolveProperty(address) {
  const record = findPropertyByAddress(address);
  if (!record) {
    const err = new Error(
      "Address not found in Portland Metro demo dataset. Try: 4521 SE Hawthorne Blvd, 2847 SW Patton Rd, or 4321 NE Alberta St."
    );
    err.code = "NOT_FOUND";
    throw err;
  }
  return record;
}

export async function runAgentPipeline(propertyRecord, buyerProfile = {}, onProgress) {
  const emit = (id, status, message) => {
    if (onProgress) onProgress({ id, status, message });
  };

  emit("spatial", "RUNNING", AGENT_PIPELINE[0].startMessage);
  const spatialResult = await runSpatialAgent(propertyRecord);
  emit("spatial", "COMPLETED", "Spatial hazard overlay complete.");

  emit("legal", "RUNNING", AGENT_PIPELINE[1].startMessage);
  const legalResult = await runLegalAgent(propertyRecord);
  emit("legal", "COMPLETED", "Permit and lien audit complete.");

  emit("finance", "RUNNING", AGENT_PIPELINE[2].startMessage);
  const financeResult = await runFinanceAgent(propertyRecord, buyerProfile);
  emit("finance", "COMPLETED", "Finance and assistance matching complete.");

  emit("synthesis", "RUNNING", AGENT_PIPELINE[3].startMessage);
  let synthesisNotes = null;

  const reportDraft = buildIntelReport({
    propertyRecord,
    spatialResult,
    legalResult,
    financeResult,
  });

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      synthesisNotes = await synthesizeWithClaude(reportDraft);
    } catch (err) {
      synthesisNotes = `Synthesis unavailable (${err.message}). Review red flags and cost breakdown below.`;
    }
  } else {
    synthesisNotes = buildFallbackSynthesis(reportDraft);
  }

  const report = buildIntelReport({
    propertyRecord,
    spatialResult,
    legalResult,
    financeResult,
    synthesisNotes,
  });

  emit("synthesis", "COMPLETED", "Intel report ready.");

  return {
    report,
    agent_results: { spatial: spatialResult, legal: legalResult, finance: financeResult },
  };
}

function createAnthropicClient() {
  const options = { apiKey: process.env.ANTHROPIC_API_KEY };
  if (process.env.ANTHROPIC_BASE_URL) {
    options.baseURL = process.env.ANTHROPIC_BASE_URL.replace(/\/$/, "");
  }
  return new Anthropic(options);
}

async function synthesizeWithClaude(reportDraft) {
  const client = createAnthropicClient();
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514";

  const message = await client.messages.create({
    model,
    max_tokens: 1024,
    system: CORE_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Synthesize this HomeBase agent output for a first-time buyer:\n\n${JSON.stringify(reportDraft, null, 2)}`,
      },
    ],
  });

  return message.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("\n");
}

function buildFallbackSynthesis(report) {
  const { hazard_score, risk_level, red_flags } = report.risk_assessment;
  const high = red_flags.filter((f) => f.severity === "HIGH");
  const programs = report.financial_matching.eligible_assistance_programs.length;
  const monthly = report.financial_matching.true_monthly_cost;

  let summary = `Risk score ${hazard_score}/100 (${risk_level}). Estimated true monthly cost $${monthly.toLocaleString()}. `;

  if (high.length === 0) {
    summary += "No critical red flags detected — favorable profile for a first-time buyer. ";
  } else {
    summary += `${high.length} high-severity issue(s): ${high.map((f) => f.summary).join("; ")}. `;
  }

  summary += `${programs} assistance program(s) may apply. Review the red flag ledger and permit timeline before making an offer.`;
  return summary;
}

export async function generateIntelReport(address, buyerProfile = {}, onProgress) {
  const propertyRecord = await resolveProperty(address);
  return runAgentPipeline(propertyRecord, buyerProfile, onProgress);
}
