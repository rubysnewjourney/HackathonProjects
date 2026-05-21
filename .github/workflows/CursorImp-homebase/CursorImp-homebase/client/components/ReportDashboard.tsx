"use client";

import { useState } from "react";
import type { IntelReport, RedFlag } from "@/lib/types";

function riskColor(score: number) {
  if (score >= 50) return { ring: "text-red-500", bg: "bg-red-50", label: "HIGH" };
  if (score >= 25) return { ring: "text-amber-500", bg: "bg-amber-50", label: "MEDIUM" };
  return { ring: "text-emerald-500", bg: "bg-emerald-50", label: "LOW" };
}

function severityStyles(severity: RedFlag["severity"]) {
  switch (severity) {
    case "HIGH":
      return "border-l-red-500 bg-red-50/80";
    case "MEDIUM":
      return "border-l-amber-500 bg-amber-50/80";
    default:
      return "border-l-emerald-500 bg-emerald-50/80";
  }
}

function SeverityIcon({ severity }: { severity: RedFlag["severity"] }) {
  const map = { HIGH: "🔴", MEDIUM: "🟡", LOW: "🟢" };
  return <span aria-hidden>{map[severity]}</span>;
}

interface Props {
  report: IntelReport;
  onNewSearch: () => void;
}

export function ReportDashboard({ report, onNewSearch }: Props) {
  const [costExpanded, setCostExpanded] = useState(true);
  const { property_metadata, risk_assessment, legal_summary, financial_matching, synthesis_notes } =
    report;
  const risk = riskColor(risk_assessment.hazard_score);
  const programs = financial_matching.eligible_assistance_programs;

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs text-portland-moss font-semibold uppercase tracking-wide">
              First-Time Buyer Intel Report
            </p>
            <h1 className="text-xl font-display text-portland-river">
              {property_metadata.formatted_address}
            </h1>
            <p className="text-sm text-slate-500">
              {property_metadata.county} County · Built {property_metadata.year_built} ·{" "}
              {property_metadata.square_footage.toLocaleString()} sqft
            </p>
          </div>
          <button
            type="button"
            onClick={onNewSearch}
            className="text-sm text-portland-river border border-portland-river px-4 py-2 rounded-lg hover:bg-portland-river hover:text-white transition"
          >
            New search
          </button>
        </div>

        <div className="max-w-6xl mx-auto px-4 pb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`rounded-2xl p-5 ${risk.bg} flex items-center gap-4`}>
            <div
              className={`relative flex h-20 w-20 items-center justify-center rounded-full border-4 ${risk.ring} bg-white font-bold text-2xl`}
            >
              {risk_assessment.hazard_score}
            </div>
            <div>
              <p className="text-sm text-slate-600">Risk score</p>
              <p className={`font-semibold ${risk.ring}`}>{risk.label} risk</p>
            </div>
          </div>

          <div className="rounded-2xl p-5 bg-portland-river text-white">
            <p className="text-sm text-white/70">True monthly cost</p>
            <p className="text-3xl font-bold">
              ${financial_matching.true_monthly_cost.toLocaleString()}
            </p>
            <p className="text-xs text-white/60 mt-1">PITI + HOA + taxes + utilities</p>
          </div>

          <div className="rounded-2xl p-5 bg-portland-gold/20 border border-portland-gold/40 flex items-center justify-center">
            <div className="text-center">
              <span className="inline-block bg-portland-moss text-white text-lg font-bold px-4 py-2 rounded-full">
                {programs.length} Programs Found
              </span>
              <p className="text-xs text-slate-600 mt-2">OHCS & local DPA matches</p>
            </div>
          </div>
        </div>
      </header>

      {synthesis_notes && (
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5 text-slate-700 leading-relaxed">
            <p className="text-xs font-semibold text-portland-moss uppercase mb-2">
              Core Controller synthesis
            </p>
            {synthesis_notes}
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-portland-river mb-4">Red flag ledger</h2>
            {risk_assessment.red_flags.length === 0 ? (
              <p className="text-slate-600 text-sm">No red flags detected for this property.</p>
            ) : (
              <ul className="space-y-4">
                {risk_assessment.red_flags.map((flag, i) => (
                  <li
                    key={`${flag.category}-${i}`}
                    className={`border-l-4 rounded-r-lg p-4 ${severityStyles(flag.severity)}`}
                  >
                    <div className="flex items-start gap-2">
                      <SeverityIcon severity={flag.severity} />
                      <div>
                        <p className="font-semibold text-slate-900">{flag.summary}</p>
                        <p className="text-sm text-slate-600 mt-1">{flag.description}</p>
                        {flag.next_steps && (
                          <p className="text-sm mt-2 text-portland-river">
                            <strong>Next step:</strong> {flag.next_steps}
                          </p>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-portland-river mb-4">Permit history</h2>
            <ol className="relative border-l-2 border-portland-moss/30 ml-3 space-y-6">
              {legal_summary.permit_timeline.map((item) => (
                <li key={`${item.year}-${item.label}`} className="ml-6">
                  <span className="absolute -left-[9px] mt-1 h-4 w-4 rounded-full bg-portland-moss" />
                  <p className="text-sm font-semibold text-slate-800">{item.year}</p>
                  <p className="text-sm text-slate-600">{item.label}</p>
                  <span className="text-xs text-emerald-700 font-medium">{item.status}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-portland-river mb-3">Environmental overlays</h2>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-slate-500">FEMA flood zone</dt>
                <dd className="font-medium">{risk_assessment.environmental_overlays.fema_flood_zone}</dd>
              </div>
              <div>
                <dt className="text-slate-500">DOGAMI liquefaction</dt>
                <dd className="font-medium">
                  {risk_assessment.environmental_overlays.dogami_liquefaction_risk}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Wildfire interface</dt>
                <dd className="font-medium">
                  {risk_assessment.environmental_overlays.wildfire_interface_rating}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Superfund proximity</dt>
                <dd className="font-medium">
                  {risk_assessment.environmental_overlays.superfund_proximity_miles} mi
                </dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <button
              type="button"
              onClick={() => setCostExpanded(!costExpanded)}
              className="w-full flex items-center justify-between text-left"
            >
              <h2 className="text-lg font-semibold text-portland-river">True cost calculator</h2>
              <span className="text-slate-400">{costExpanded ? "−" : "+"}</span>
            </button>
            {costExpanded && (
              <ul className="mt-4 space-y-2 text-sm">
                {[
                  ["Principal & interest", financial_matching.cost_breakdown.principal_interest],
                  ["Property tax", financial_matching.cost_breakdown.property_tax],
                  ["Insurance", financial_matching.cost_breakdown.insurance],
                  ["HOA", financial_matching.cost_breakdown.hoa],
                  ["Utilities (est.)", financial_matching.cost_breakdown.utilities],
                ].map(([label, amount]) => (
                  <li key={label} className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-600">{label}</span>
                    <span className="font-medium">${Number(amount).toLocaleString()}/mo</span>
                  </li>
                ))}
                <li className="flex justify-between pt-2 font-bold text-portland-river">
                  <span>Total</span>
                  <span>${financial_matching.true_monthly_cost.toLocaleString()}/mo</span>
                </li>
              </ul>
            )}
            <p className="text-xs text-slate-500 mt-3">
              Assessed value ${financial_matching.tax_breakdown.assessed_value.toLocaleString()}
              {financial_matching.tax_breakdown.estimated_annual_tax != null &&
                ` · ~$${financial_matching.tax_breakdown.estimated_annual_tax.toLocaleString()}/yr tax`}
            </p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <h2 className="text-lg font-semibold text-portland-river mb-4">
              OHCS & assistance programs
            </h2>
            <div className="space-y-4">
              {programs.map((p) => (
                <article
                  key={p.program_id}
                  className="rounded-xl border border-portland-moss/20 p-4 hover:border-portland-moss/50 transition"
                >
                  <p className="text-xs text-slate-500">{p.program_id}</p>
                  <h3 className="font-semibold text-slate-900">{p.name}</h3>
                  <p className="text-sm text-portland-moss font-medium mt-1">
                    Est. subsidy up to ${p.estimated_subsidy_value.toLocaleString()}
                  </p>
                  {p.application_url && (
                    <a
                      href={p.application_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-2 text-sm text-portland-river underline"
                    >
                      Application info →
                    </a>
                  )}
                </article>
              ))}
            </div>
          </div>

          <div className="h-48 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center text-slate-500 text-sm border border-slate-200">
            Property photo placeholder
          </div>
        </section>
      </main>
    </div>
  );
}
