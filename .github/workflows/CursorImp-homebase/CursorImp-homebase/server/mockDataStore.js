/**
 * Localized Portland Metro property records for HomeBase demo cases.
 * Keys are normalized address fragments for fuzzy lookup.
 */

export const PROPERTIES = {
  "4521 se hawthorne blvd": {
    id: "PROP-SE-CLEAN",
    property_metadata: {
      formatted_address: "4521 SE Hawthorne Blvd, Portland, OR 97215",
      county: "Multnomah",
      parcel_id: "R123456-78",
      year_built: 2018,
      square_footage: 1420,
      listing_sqft: 1420,
      list_price: 485000,
      neighborhood_median_tax_annual: 5200,
    },
    spatial: {
      dogami_landslide_zone: false,
      dogami_liquefaction_risk: "Low",
      fema_flood_zone: "X",
      wildfire_interface_rating: "Minimal",
      superfund_proximity_miles: 4.8,
      cascadia_liquefaction_vector: false,
    },
    legal: {
      permits: [
        { year: 2017, type: "New Construction", status: "FINAL", description: "Single-family dwelling" },
        { year: 2019, type: "Electrical", status: "FINAL", description: "EV charger install" },
      ],
      unpermitted_sqft_delta: 0,
      listing_claims_finished_basement: false,
      active_liens: [],
      municipal_violations: [],
      assessed_value: 465000,
      tax_trend_vs_neighborhood_pct: 2,
    },
    finance: {
      millage_rate: 0.0196,
      hoa_monthly: 0,
      estimated_insurance_monthly: 145,
      estimated_utilities_monthly: 185,
      eligible_programs: [
        {
          program_id: "OHCS-FTHB-01",
          name: "Oregon Bond Residential Loan Program",
          estimated_subsidy_value: 12000,
          application_url: "https://www.oregon.gov/ohcs/homeownership",
        },
        {
          program_id: "PORTLAND-DPA-02",
          name: "Portland Housing Bureau Down Payment Assistance",
          estimated_subsidy_value: 8000,
          application_url: "https://www.portland.gov/phb/homeownership",
        },
      ],
    },
    profile: "clean",
  },

  "2847 sw patton rd": {
    id: "PROP-WEST-HILLS",
    property_metadata: {
      formatted_address: "2847 SW Patton Rd, Portland, OR 97201",
      county: "Multnomah",
      parcel_id: "R987654-32",
      year_built: 1962,
      square_footage: 2280,
      listing_sqft: 2280,
      list_price: 875000,
      neighborhood_median_tax_annual: 9800,
    },
    spatial: {
      dogami_landslide_zone: true,
      dogami_liquefaction_risk: "High",
      fema_flood_zone: "X",
      wildfire_interface_rating: "High",
      superfund_proximity_miles: 2.1,
      cascadia_liquefaction_vector: true,
    },
    legal: {
      permits: [
        { year: 1962, type: "Structural", status: "FINAL", description: "Original build" },
        { year: 2008, type: "Retaining Wall", status: "FINAL", description: "Hillside stabilization" },
      ],
      unpermitted_sqft_delta: 0,
      listing_claims_finished_basement: false,
      active_liens: [],
      municipal_violations: [],
      assessed_value: 820000,
      tax_trend_vs_neighborhood_pct: 8,
    },
    finance: {
      millage_rate: 0.0196,
      hoa_monthly: 0,
      estimated_insurance_monthly: 285,
      estimated_utilities_monthly: 240,
      eligible_programs: [
        {
          program_id: "OHCS-FTHB-01",
          name: "Oregon Bond Residential Loan Program",
          estimated_subsidy_value: 15000,
          application_url: "https://www.oregon.gov/ohcs/homeownership",
        },
      ],
    },
    profile: "hazard",
  },

  "4321 ne alberta st": {
    id: "PROP-NE-RISK",
    property_metadata: {
      formatted_address: "4321 NE Alberta St, Portland, OR 97213",
      county: "Multnomah",
      parcel_id: "R555121-09",
      year_built: 1924,
      square_footage: 1850,
      listing_sqft: 2100,
      list_price: 425000,
      neighborhood_median_tax_annual: 5300,
    },
    spatial: {
      dogami_landslide_zone: false,
      dogami_liquefaction_risk: "Moderate",
      fema_flood_zone: "X",
      wildfire_interface_rating: "Moderate",
      superfund_proximity_miles: 1.2,
      cascadia_liquefaction_vector: false,
    },
    legal: {
      permits: [
        { year: 1924, type: "Structural", status: "FINAL", description: "Original build" },
        { year: 1998, type: "Plumbing", status: "FINAL", description: "Bathroom remodel" },
      ],
      unpermitted_sqft_delta: 250,
      listing_claims_finished_basement: true,
      listing_basement_description: "fully finished basement bedroom with egress",
      active_liens: [
        { type: "Mechanics Lien", amount: 18500, filed_date: "2024-11-12", creditor: "NW Basement Pros LLC" },
      ],
      municipal_violations: [],
      assessed_value: 310000,
      tax_trend_vs_neighborhood_pct: 18,
    },
    finance: {
      millage_rate: 0.0196,
      hoa_monthly: 0,
      estimated_insurance_monthly: 165,
      estimated_utilities_monthly: 210,
      eligible_programs: [
        {
          program_id: "OHCS-FTHB-01",
          name: "Oregon Bond Residential Loan Program",
          estimated_subsidy_value: 15000,
          application_url: "https://www.oregon.gov/ohcs/homeownership",
        },
        {
          program_id: "CLACK-DPA-03",
          name: "Metro Down Payment Initiative",
          estimated_subsidy_value: 10000,
          application_url: "https://www.oregon.gov/ohcs/assistance",
        },
        {
          program_id: "PORTLAND-UTILITY-04",
          name: "Portland Clean Energy Fund — Home Efficiency Rebate",
          estimated_subsidy_value: 3500,
          application_url: "https://www.portland.gov/bps/cleanenergy",
        },
      ],
    },
    profile: "legal-risk",
  },
};

export const DEMO_ADDRESSES = Object.values(PROPERTIES).map(
  (p) => p.property_metadata.formatted_address
);

function normalizeAddress(input) {
  return input
    .toLowerCase()
    .replace(/[,#.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function findPropertyByAddress(address) {
  const normalized = normalizeAddress(address);

  for (const [key, record] of Object.entries(PROPERTIES)) {
    if (normalized.includes(key) || key.includes(normalized.slice(0, 20))) {
      return record;
    }
    const formatted = normalizeAddress(record.property_metadata.formatted_address);
    if (normalized.includes(formatted) || formatted.includes(normalized)) {
      return record;
    }
  }

  const partial = Object.entries(PROPERTIES).find(([key]) => {
    const tokens = normalized.split(" ").filter((t) => t.length > 2);
    return tokens.some((t) => key.includes(t));
  });

  return partial ? partial[1] : null;
}

export function listProperties() {
  return Object.values(PROPERTIES).map((p) => ({
    id: p.id,
    address: p.property_metadata.formatted_address,
    profile: p.profile,
    list_price: p.property_metadata.list_price,
  }));
}
