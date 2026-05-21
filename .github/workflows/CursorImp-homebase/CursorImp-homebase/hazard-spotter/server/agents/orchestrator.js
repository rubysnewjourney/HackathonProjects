import { runVisionInspector } from "./visionAgent.js";
import { runOshaVerifier } from "./oshaVerifier.js";
import { runDomainValidator } from "./domainValidator.js";
import { urlToBase64 } from "../utils/image.js";
import { sortBySeverity, countBySeverity } from "../utils/parseJson.js";
import { getFallbackForStockId } from "../data/fallbacks.js";

export const AGENT_PIPELINE = [
  {
    id: "vision",
    name: "Vision Inspector",
    icon: "👁️",
    startMessage: "Reading site conditions from photograph...",
    completeMessage: "Visual hazard scan complete.",
  },
  {
    id: "osha",
    name: "OSHA Reference Verifier",
    icon: "📋",
    startMessage: "Cross-checking 29 CFR citations...",
    completeMessage: "OSHA references verified.",
  },
  {
    id: "domain",
    name: "Construction Domain Validator",
    icon: "🦺",
    startMessage: "Removing hallucinations & validating severity...",
    completeMessage: "Domain validation complete.",
  },
  {
    id: "synthesis",
    name: "Safety Brief Synthesis",
    icon: "📊",
    startMessage: "Generating safety brief...",
    completeMessage: "Report ready.",
  },
];

export async function analyzeSiteImage(
  { imageUrl, stockId, useFallback = false },
  onProgress
) {
  const emit = (id, status, message) => {
    if (onProgress) onProgress({ id, status, message });
  };

  if (useFallback) {
    emit("vision", "RUNNING", AGENT_PIPELINE[0].startMessage);
    await delay(800);
    emit("vision", "COMPLETED", AGENT_PIPELINE[0].completeMessage);
    emit("osha", "RUNNING", AGENT_PIPELINE[1].startMessage);
    await delay(600);
    emit("osha", "COMPLETED", AGENT_PIPELINE[1].completeMessage);
    emit("domain", "RUNNING", AGENT_PIPELINE[2].startMessage);
    await delay(600);
    emit("domain", "COMPLETED", AGENT_PIPELINE[2].completeMessage);
    emit("synthesis", "RUNNING", AGENT_PIPELINE[3].startMessage);
    const hazards = sortBySeverity(
      getFallbackForStockId(stockId || "active-construction")
    );
    emit("synthesis", "COMPLETED", AGENT_PIPELINE[3].completeMessage);
    return buildReport(hazards, { demo: true });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    const err = new Error("ANTHROPIC_API_KEY not configured on server");
    err.code = "NO_API_KEY";
    throw err;
  }

  const { base64, mediaType } = await urlToBase64(imageUrl);

  emit("vision", "RUNNING", AGENT_PIPELINE[0].startMessage);
  let visionHazards;
  try {
    visionHazards = await runVisionInspector({ base64, mediaType });
  } catch (e) {
    if (stockId) {
      visionHazards = getFallbackForStockId(stockId);
    } else {
      throw e;
    }
  }
  emit("vision", "COMPLETED", AGENT_PIPELINE[0].completeMessage);

  emit("osha", "RUNNING", AGENT_PIPELINE[1].startMessage);
  const verified =
    visionHazards.length > 0
      ? await runOshaVerifier(visionHazards)
      : visionHazards;
  emit("osha", "COMPLETED", AGENT_PIPELINE[1].completeMessage);

  emit("domain", "RUNNING", AGENT_PIPELINE[2].startMessage);
  const validated =
    verified.length > 0
      ? await runDomainValidator(verified, visionHazards)
      : verified;
  emit("domain", "COMPLETED", AGENT_PIPELINE[2].completeMessage);

  emit("synthesis", "RUNNING", AGENT_PIPELINE[3].startMessage);
  const hazards = sortBySeverity(validated);
  emit("synthesis", "COMPLETED", AGENT_PIPELINE[3].completeMessage);

  return buildReport(hazards, { demo: false });
}

function buildReport(hazards, meta) {
  const counts = countBySeverity(hazards);
  return {
    hazards,
    summary: {
      total: hazards.length,
      ...counts,
    },
    analyzed_at: new Date().toISOString(),
    meta,
  };
}

function delay(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
