"use client";

import type { BuyerProfile } from "@/lib/types";

interface Props {
  open: boolean;
  onClose: () => void;
  profile: BuyerProfile;
  onChange: (profile: BuyerProfile) => void;
}

export function FinancialProfileDrawer({ open, onClose, profile, onChange }: Props) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-label="Close drawer"
      />
      <aside className="relative z-10 h-full w-full max-w-md bg-white shadow-2xl p-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-portland-river">Financial Profile</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-slate-800 text-2xl leading-none"
          >
            ×
          </button>
        </div>
        <p className="text-sm text-slate-600 mb-6">
          Optional inputs for OHCS grant matching and true monthly cost estimates.
        </p>

        <label className="block mb-4">
          <span className="text-sm font-medium text-slate-700">Down payment cash ($)</span>
          <input
            type="number"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            placeholder="e.g. 25000"
            value={profile.down_payment ?? ""}
            onChange={(e) =>
              onChange({
                ...profile,
                down_payment: e.target.value ? Number(e.target.value) : undefined,
              })
            }
          />
        </label>

        <label className="block mb-4">
          <span className="text-sm font-medium text-slate-700">Household income ($/yr)</span>
          <input
            type="number"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            placeholder="e.g. 85000"
            value={profile.household_income ?? ""}
            onChange={(e) =>
              onChange({
                ...profile,
                household_income: e.target.value ? Number(e.target.value) : undefined,
              })
            }
          />
        </label>

        <label className="flex items-center gap-3 mb-6">
          <input
            type="checkbox"
            checked={profile.first_time_buyer !== false}
            onChange={(e) => onChange({ ...profile, first_time_buyer: e.target.checked })}
            className="h-4 w-4 rounded border-slate-300"
          />
          <span className="text-sm font-medium text-slate-700">First-time homebuyer</span>
        </label>

        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-lg bg-portland-moss text-white py-3 font-medium hover:bg-portland-river transition"
        >
          Save profile
        </button>
      </aside>
    </div>
  );
}
