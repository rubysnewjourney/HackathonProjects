import { queryLegalPermits } from "../tools/legalTools.js";

const AGENT_NAME = "Legal & Permit History Agent";

export async function runLegalAgent(propertyRecord) {
  const data = queryLegalPermits(propertyRecord);
  const flags = [];

  if (data.permit_mismatch) {
    flags.push({
      severity: "HIGH",
      category: "PERMIT_MISMATCH",
      summary: "Unpermitted work or square footage mismatch detected",
      description:
        data.permit_mismatch_detail ||
        `Assessor shows ${data.assessor.sqft_on_record} sqft; listing claims ${data.assessor.listing_sqft} sqft.`,
      next_steps:
        "Ask seller for contractor receipts, structural sign-offs, or price reduction for legalization costs.",
    });
  }

  if (data.liens.length > 0) {
    for (const lien of data.liens) {
      flags.push({
        severity: "HIGH",
        category: "LIEN",
        summary: `Active ${lien.type}`,
        description: `$${lien.amount.toLocaleString()} filed ${lien.filed_date} by ${lien.creditor}`,
        next_steps: "Require lien payoff at closing via escrow; verify title commitment.",
      });
    }
  }

  for (const v of data.municipal_violations) {
    flags.push({
      severity: "HIGH",
      category: "CODE_VIOLATION",
      summary: v.type || "Municipal code violation",
      description: v.description,
      next_steps: "Request clearance letter from City of Portland Code Enforcement.",
    });
  }

  if (data.assessor.tax_trend_vs_neighborhood_pct > 15) {
    flags.push({
      severity: "MEDIUM",
      category: "TAX_TREND",
      summary: "Property taxes trending above neighborhood median",
      description: `Assessed taxes ${data.assessor.tax_trend_vs_neighborhood_pct}% above neighborhood median.`,
      next_steps: "File appeal with Multnomah County Assessment & Taxation if comparable sales support lower value.",
    });
  }

  const openPermits = data.permits.filter((p) => p.status !== "FINAL");
  if (openPermits.length > 0) {
    flags.push({
      severity: "LOW",
      category: "OPEN_PERMIT",
      summary: "Open permit on record",
      description: openPermits.map((p) => `${p.type} (${p.year})`).join(", "),
      next_steps: "Confirm permit closure before closing; seller should finalize or transfer.",
    });
  }

  return {
    agent: AGENT_NAME,
    status: "COMPLETED",
    raw: data,
    flags,
    permit_timeline: data.permit_timeline,
  };
}
