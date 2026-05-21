/** Pre-verified demo results when API is unavailable or for instant demo */
export const FALLBACK_HAZARDS = {
  "scaffold-no-rail": [
    {
      category: "Fall Hazards",
      hazard_title: "Unprotected Leading Edge",
      description:
        "Workers are visible near an unprotected edge on an elevated platform without visible guardrails or fall arrest systems. A fall from height poses immediate fatality risk.",
      severity: "high",
      action: "Install guardrails, mid-rails, and toe boards per OSHA; use personal fall arrest where guardrails are infeasible.",
      osha_reference: "29 CFR 1926.502(b)",
    },
    {
      category: "Personal Protective Equipment (PPE)",
      hazard_title: "Missing Hard Hats Visible",
      description:
        "At least one worker in the active zone appears without a hard hat while overhead work and materials handling occur nearby.",
      severity: "high",
      action: "Enforce 100% hard hat policy in the work zone before resuming tasks.",
      osha_reference: "29 CFR 1926.100",
    },
    {
      category: "Housekeeping & Site Conditions",
      hazard_title: "Debris Near Walkway",
      description:
        "Scrap materials and tools appear clustered along a primary walking path, increasing trip hazards in a high-traffic area.",
      severity: "medium",
      action: "Clear egress paths and stage materials in designated laydown areas.",
      osha_reference: "29 CFR 1926.25",
    },
  ],
  "excavation-trench": [
    {
      category: "Structural & Excavation",
      hazard_title: "Unprotected Trench Edge",
      description:
        "An open excavation is visible without continuous shoring, sloping, or trench box protection. Cave-in risk is present for anyone within the collapse zone.",
      severity: "high",
      action: "Stop work in the trench; install protective systems or slope per soil classification before re-entry.",
      osha_reference: "29 CFR 1926.652",
    },
    {
      category: "Signage & Site Access Control",
      hazard_title: "Missing Barrier Around Excavation",
      description:
        "No physical barricade or high-visibility warning line is visible around the excavation perimeter to keep unauthorized foot traffic out.",
      severity: "high",
      action: "Install barricades and warning signage at least 6 feet from the edge where required.",
      osha_reference: "29 CFR 1926.502(f)",
    },
    {
      category: "Equipment & Machinery",
      hazard_title: "Equipment Near Trench Lip",
      description:
        "Heavy equipment or spoil piles appear positioned close to the excavation edge, adding surcharge load and collapse risk.",
      severity: "medium",
      action: "Keep equipment and spoils at least 2 feet from trench edges (more for deeper trenches).",
      osha_reference: "29 CFR 1926.651(j)(2)",
    },
  ],
  "active-construction": [
    {
      category: "Equipment & Machinery",
      hazard_title: "No Visible Spotter",
      description:
        "Mobile equipment operates in a congested area without a clearly identifiable spotter directing pedestrians and reversing paths.",
      severity: "medium",
      action: "Assign a dedicated spotter and establish exclusion zones during equipment movement.",
      osha_reference: "29 CFR 1926.601(b)(4)",
    },
    {
      category: "Personal Protective Equipment (PPE)",
      hazard_title: "Hi-Vis Not Worn",
      description:
        "Workers near equipment and vehicle paths lack high-visibility apparel, reducing conspicuity in mixed traffic zones.",
      severity: "medium",
      action: "Issue and require ANSI Class 2 or 3 hi-vis vests in equipment interaction areas.",
      osha_reference: "29 CFR 1926.201(a)",
    },
    {
      category: "Fire & Chemical Hazards",
      hazard_title: "Fuel Cans Unsecured",
      description:
        "Portable fuel containers appear stored in the active work area rather than an approved flammable storage location.",
      severity: "low",
      action: "Move fuel to approved cabinets away from ignition sources and hot work.",
      osha_reference: "29 CFR 1926.152(b)",
    },
  ],
};

export function getFallbackForStockId(stockId) {
  return FALLBACK_HAZARDS[stockId] ?? FALLBACK_HAZARDS["active-construction"];
}
