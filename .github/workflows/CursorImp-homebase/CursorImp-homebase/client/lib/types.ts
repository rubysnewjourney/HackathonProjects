export type AppView = "SEARCHING" | "PROCESSING" | "REPORT_READY";

export type AgentStatus = "WAITING" | "RUNNING" | "COMPLETED";

export interface BuyerProfile {
  down_payment?: number;
  household_income?: number;
  first_time_buyer?: boolean;
  interest_rate?: number;
}

export interface RedFlag {
  severity: "HIGH" | "MEDIUM" | "LOW";
  category: string;
  summary: string;
  description: string;
  next_steps?: string;
}

export interface AssistanceProgram {
  program_id: string;
  name: string;
  estimated_subsidy_value: number;
  application_url?: string;
}

export interface IntelReport {
  property_metadata: {
    formatted_address: string;
    county: string;
    year_built: number;
    square_footage: number;
    list_price?: number;
    parcel_id?: string;
  };
  risk_assessment: {
    hazard_score: number;
    risk_level: string;
    severity_counts?: Record<string, number>;
    red_flags: RedFlag[];
    environmental_overlays: {
      fema_flood_zone: string;
      dogami_liquefaction_risk: string;
      dogami_landslide_zone?: boolean;
      wildfire_interface_rating: string;
      superfund_proximity_miles: number;
    };
  };
  legal_summary: {
    permit_timeline: { year: number; label: string; status: string }[];
    active_liens: unknown[];
    permit_mismatch: boolean;
  };
  financial_matching: {
    true_monthly_cost: number;
    tax_breakdown: {
      assessed_value: number;
      estimated_annual_tax?: number;
    };
    cost_breakdown: {
      principal_interest: number;
      property_tax: number;
      insurance: number;
      hoa: number;
      utilities: number;
    };
    eligible_assistance_programs: AssistanceProgram[];
  };
  synthesis_notes?: string;
  generated_at?: string;
}

export interface AgentProgress {
  id: string;
  status: AgentStatus;
  message: string;
}
