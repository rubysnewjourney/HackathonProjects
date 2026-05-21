const SEVERITY_WEIGHTS = { HIGH: 25, MEDIUM: 12, LOW: 5 };

/**
 * Computes hazard_score (0–100, higher = riskier) and merges agent outputs
 * into the PRD API Integration Payload schema.
 */
export function buildIntelReport({
  propertyRecord,
  spatialResult,
  legalResult,
  financeResult,
  synthesisNotes = null,
}) {
  const allFlags = [
    ...spatialResult.flags,
    ...legalResult.flags,
    ...financeResult.flags,
  ];

  const severityCounts = { HIGH: 0, MEDIUM: 0, LOW: 0 };
  let rawScore = 0;
  for (const flag of allFlags) {
    const sev = flag.severity || "LOW";
    severityCounts[sev] = (severityCounts[sev] || 0) + 1;
    rawScore += SEVERITY_WEIGHTS[sev] || 5;
  }

  const hazard_score = Math.min(100, Math.max(0, rawScore));
  const risk_level =
    hazard_score >= 50 ? "HIGH" : hazard_score >= 25 ? "MEDIUM" : "LOW";

  const meta = propertyRecord.property_metadata;
  const spatial = spatialResult.raw;

  return {
    property_metadata: {
      formatted_address: meta.formatted_address,
      county: meta.county,
      year_built: meta.year_built,
      square_footage: meta.square_footage,
      list_price: meta.list_price,
      parcel_id: meta.parcel_id,
    },
    risk_assessment: {
      hazard_score,
      risk_level,
      severity_counts: severityCounts,
      red_flags: allFlags,
      environmental_overlays: {
        fema_flood_zone: spatial.fema.flood_zone,
        dogami_liquefaction_risk: spatial.dogami.liquefaction_risk,
        dogami_landslide_zone: propertyRecord.spatial.dogami_landslide_zone,
        wildfire_interface_rating: spatial.wildfire.interface_rating,
        superfund_proximity_miles: spatial.epa_echo.proximity_miles,
      },
    },
    legal_summary: {
      permit_timeline: legalResult.permit_timeline,
      active_liens: legalResult.raw.liens,
      permit_mismatch: legalResult.raw.permit_mismatch,
    },
    financial_matching: financeResult.financial_matching,
    agent_trace: {
      spatial: { agent: spatialResult.agent, flag_count: spatialResult.flags.length },
      legal: { agent: legalResult.agent, flag_count: legalResult.flags.length },
      finance: { agent: financeResult.agent, flag_count: financeResult.flags.length },
    },
    synthesis_notes: synthesisNotes,
    generated_at: new Date().toISOString(),
  };
}
