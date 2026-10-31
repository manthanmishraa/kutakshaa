const safeguards = [
  'No cloud storage of raw video by default',
  'Only derived behavior metrics and anonymized landmarks retained',
  'Encrypted transport (TLS) and encrypted storage',
  'Role-based access and consent-driven usage',
  'Audit-ready event logs for accountability',
];

export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 md:px-6 lg:px-8 xl:px-10">
      <section className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl md:p-8">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Privacy by Design</p>
        <h2 className="mt-2 text-3xl font-semibold text-slate-900">Built to protect dignity while enabling care</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-700">
          Kutaksha prioritizes privacy from architecture to operations. Our approach is to process behavior signals with minimal personal exposure while delivering preventive value.
        </p>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white/85 p-5">
          <h3 className="text-lg font-semibold text-slate-900">Core Safeguards</h3>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            {safeguards.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white/85 p-5">
          <h3 className="text-lg font-semibold text-slate-900">Data Flow</h3>
          <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            Camera → Edge/Secure Processing → Pose Landmarks → Behavior Metrics → Digital Twin → Encrypted Insights
          </div>
          <p className="mt-3 text-xs text-slate-600">
            Clinical decisions remain with healthcare professionals. Kutaksha is a preventive decision-support system.
          </p>
        </article>
      </section>
    </div>
  );
}
