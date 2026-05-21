/** Mock Portland BDS / Assessor / SOS lien accessors */

export function queryLegalPermits(propertyRecord) {
  const { legal, property_metadata } = propertyRecord;

  const permitMismatch =
    legal.unpermitted_sqft_delta > 0 ||
    (legal.listing_claims_finished_basement &&
      !legal.permits.some((p) => p.type.toLowerCase().includes("structural") && p.year > 1998));

  return {
    source: "Portland BDS / Multnomah Assessor / OR SOS Mock APIs",
    parcel_id: property_metadata.parcel_id,
    county: property_metadata.county,
    permits: legal.permits,
    permit_timeline: legal.permits.map((p) => ({
      year: p.year,
      label: `${p.type} — ${p.description}`,
      status: p.status,
    })),
    assessor: {
      assessed_value: legal.assessed_value,
      tax_trend_vs_neighborhood_pct: legal.tax_trend_vs_neighborhood_pct,
      sqft_on_record: property_metadata.square_footage,
      listing_sqft: property_metadata.listing_sqft,
      unpermitted_sqft_delta: legal.unpermitted_sqft_delta,
    },
    permit_mismatch: permitMismatch,
    permit_mismatch_detail: permitMismatch
      ? legal.listing_basement_description ||
        `Listing shows ${property_metadata.listing_sqft} sqft vs ${property_metadata.square_footage} sqft on assessor roll`
      : null,
    liens: legal.active_liens,
    municipal_violations: legal.municipal_violations,
  };
}
