import { querySpatialHazards } from "../tools/spatialTools.js";

const AGENT_NAME = "Spatial Hazard Agent";

export async function runSpatialAgent(propertyRecord) {
  const data = querySpatialHazards(propertyRecord);
  const flags = [];

  if (data.fema.in_100_year_floodplain) {
    flags.push({
      severity: "HIGH",
      category: "FLOOD_ZONE",
      summary: "Property in FEMA 100-year flood zone",
      description: `Zone ${data.fema.flood_zone}: ${data.fema.notes}`,
      next_steps:
        "Obtain elevation certificate and flood insurance quote before removing contingencies.",
    });
  }

  if (data.dogami.liquefaction_risk === "High" || data.dogami.cascadia_subduction_liquefaction) {
    flags.push({
      severity: "HIGH",
      category: "LIQUEFACTION",
      summary: "High Cascadia liquefaction exposure",
      description: `DOGAMI rates liquefaction as ${data.dogami.liquefaction_risk}. ${data.dogami.landslide_inventory}`,
      next_steps:
        "Commission a geotechnical soils report and confirm foundation type with a structural engineer.",
    });
  } else if (data.dogami.liquefaction_risk === "Moderate") {
    flags.push({
      severity: "LOW",
      category: "LIQUEFACTION",
      summary: "Moderate liquefaction risk",
      description: "Moderate seismic soil amplification possible in Cascadia event.",
      next_steps: "Review seller disclosure for prior foundation repairs.",
    });
  }

  if (data.dogami.landslide_inventory.includes("active landslide")) {
    flags.push({
      severity: "HIGH",
      category: "LANDSLIDE",
      summary: "West Hills landslide inventory zone",
      description: data.dogami.landslide_inventory,
      next_steps:
        "Require hillside stability disclosure and verify retaining wall permits with Portland BDS.",
    });
  }

  if (data.wildfire.interface_rating === "High") {
    flags.push({
      severity: "MEDIUM",
      category: "WILDFIRE",
      summary: "High wildfire interface rating",
      description: `OSFM wildfire rating: ${data.wildfire.interface_rating}. Near urban-wildland interface.`,
      next_steps: "Budget for defensible space improvements and verify insurance availability.",
    });
  } else if (data.wildfire.interface_rating === "Moderate") {
    flags.push({
      severity: "LOW",
      category: "WILDFIRE",
      summary: "Moderate wildfire interface",
      description: "Property has moderate wildland fire exposure.",
      next_steps: "Confirm homeowner insurance wildfire rider requirements.",
    });
  }

  if (data.epa_echo.within_half_mile) {
    flags.push({
      severity: "MEDIUM",
      category: "SUPERFUND",
      summary: "Within 0.5 miles of EPA Superfund perimeter",
      description: `${data.epa_echo.superfund_site} — ${data.epa_echo.proximity_miles} mi`,
      next_steps: "Review EPA ECHO site reports and lender environmental requirements.",
    });
  } else if (data.epa_echo.proximity_miles < 2) {
    flags.push({
      severity: "MEDIUM",
      category: "SUPERFUND",
      summary: "Proximity to Portland Harbor Superfund",
      description: `${data.epa_echo.proximity_miles} miles from Superfund boundary.`,
      next_steps: "Ask lender about environmental review triggers for FHA/VA loans.",
    });
  }

  return {
    agent: AGENT_NAME,
    status: "COMPLETED",
    raw: data,
    flags,
  };
}
