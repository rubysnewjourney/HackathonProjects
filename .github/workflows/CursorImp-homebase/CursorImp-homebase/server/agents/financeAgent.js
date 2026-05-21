import { queryFinanceProfile } from "../tools/financeTools.js";

const AGENT_NAME = "Local Finance & Assistance Agent";

export async function runFinanceAgent(propertyRecord, buyerProfile) {
  const data = queryFinanceProfile(propertyRecord, buyerProfile);

  const flags = [];
  const taxDelta =
    ((data.tax_breakdown.estimated_annual_tax - data.neighborhood_median_tax_annual) /
      data.neighborhood_median_tax_annual) *
    100;

  if (taxDelta > 15) {
    flags.push({
      severity: "MEDIUM",
      category: "TAX_BURDEN",
      summary: "Annual taxes exceed neighborhood median",
      description: `Estimated annual tax $${data.tax_breakdown.estimated_annual_tax} vs median $${data.neighborhood_median_tax_annual}.`,
      next_steps: "Factor higher carry cost into offer price and DTI calculations.",
    });
  }

  return {
    agent: AGENT_NAME,
    status: "COMPLETED",
    raw: data,
    flags,
    financial_matching: {
      true_monthly_cost: data.true_monthly_cost,
      tax_breakdown: data.tax_breakdown,
      cost_breakdown: data.cost_breakdown,
      eligible_assistance_programs: data.eligible_assistance_programs,
    },
  };
}
