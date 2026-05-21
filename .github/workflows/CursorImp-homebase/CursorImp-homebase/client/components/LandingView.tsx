"use client";

interface Props {
  address: string;
  onAddressChange: (v: string) => void;
  demoAddresses: string[];
  onOpenProfile: () => void;
  onSubmit: () => void;
  loading?: boolean;
}

export function LandingView({
  address,
  onAddressChange,
  demoAddresses,
  onOpenProfile,
  onSubmit,
  loading,
}: Props) {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center px-4 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-portland-river/90 via-portland-moss/80 to-slate-900" />
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.15'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative z-10 w-full max-w-2xl text-center">
        <p className="text-portland-gold text-sm font-medium tracking-widest uppercase mb-3">
          Portland Metro · First-Time Buyers
        </p>
        <h1 className="font-display text-4xl md:text-5xl text-white mb-4">HomeBase</h1>
        <p className="text-white/80 text-lg mb-10 max-w-lg mx-auto">
          Multi-agent intelligence across DOGAMI, Portland BDS, and OHCS — unified into one
          First-Time Buyer Intel Report.
        </p>

        <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-6 text-left">
          <label className="block text-sm font-medium text-slate-700 mb-2">Property address</label>
          <input
            type="text"
            list="demo-addresses"
            value={address}
            onChange={(e) => onAddressChange(e.target.value)}
            placeholder="4321 NE Alberta St, Portland, OR 97213"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-slate-900 focus:ring-2 focus:ring-portland-moss focus:border-transparent outline-none"
          />
          <datalist id="demo-addresses">
            {demoAddresses.map((a) => (
              <option key={a} value={a} />
            ))}
          </datalist>

          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <button
              type="button"
              onClick={onOpenProfile}
              className="flex-1 rounded-xl border-2 border-portland-moss text-portland-moss py-3 font-medium hover:bg-portland-moss/5 transition"
            >
              Financial profile
            </button>
            <button
              type="button"
              onClick={onSubmit}
              disabled={!address.trim() || loading}
              className="flex-1 rounded-xl bg-portland-ember text-white py-3 font-semibold hover:bg-portland-ember/90 disabled:opacity-50 transition shadow-lg"
            >
              {loading ? "Starting…" : "Generate Complete Intel Report"}
            </button>
          </div>

          <p className="text-xs text-slate-500 mt-4">
            Demo dataset: SE Hawthorne (clean), SW Patton (hazards), NE Alberta (permits/liens)
          </p>
        </div>
      </div>
    </div>
  );
}
