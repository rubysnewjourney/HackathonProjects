/** Mock DOGAMI / FEMA / EPA / wildfire data accessors */

export function querySpatialHazards(propertyRecord) {
  const { spatial, property_metadata } = propertyRecord;

  return {
    source: "DOGAMI/FEMA/EPA/OSFM Mock APIs",
    parcel_id: property_metadata.parcel_id,
    dogami: {
      landslide_inventory: spatial.dogami_landslide_zone
        ? "Portland West Hills — active landslide inventory zone"
        : "Outside mapped Portland Hills landslide inventory",
      liquefaction_risk: spatial.dogami_liquefaction_risk,
      cascadia_subduction_liquefaction: spatial.cascadia_liquefaction_vector,
    },
    fema: {
      flood_zone: spatial.fema_flood_zone,
      in_100_year_floodplain: ["A", "AE", "AH"].includes(spatial.fema_flood_zone),
      notes:
        spatial.fema_flood_zone === "X"
          ? "Minimal flood hazard — outside 100-year plain near Willamette"
          : "Special flood hazard area — flood insurance required",
    },
    wildfire: {
      interface_rating: spatial.wildfire_interface_rating,
      near_forest_park: property_metadata.formatted_address.includes("Patton"),
    },
    epa_echo: {
      superfund_site: spatial.superfund_proximity_miles < 2 ? "Portland Harbor Superfund" : null,
      proximity_miles: spatial.superfund_proximity_miles,
      within_half_mile: spatial.superfund_proximity_miles < 0.5,
    },
  };
}
