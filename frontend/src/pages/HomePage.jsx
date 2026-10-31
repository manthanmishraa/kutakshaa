const featureCards = [
  {
    title: 'Unobtrusive Behavior Monitoring',
    text: 'Camera-based motion understanding with on-device/secure processing. No wearables. No routine change for seniors.',
  },
  {
    title: 'Trajectory-First Intelligence',
    text: 'Kutaksha focuses on trend deterioration over days, not only emergency event detection in a single moment.',
  },
  {
    title: 'Personalized Digital Twin',
    text: 'Each patient is compared to their own baseline behavioral pattern, creating highly individualized preventive alerts.',
  },
  {
    title: 'Explainable Preventive Alerts',
    text: 'Risk score shifts are translated to natural-language recommendations for caregivers and care teams.',
  },
];

export default function HomePage({ onNavigate }) {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 md:px-6 lg:px-8 xl:px-10">
      <section className="mb-6 grid gap-4 lg:grid-cols-12">
        <article className="rounded-[30px] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(236,253,245,0.92),rgba(224,242,254,0.95))] p-6 shadow-[0_25px_90px_rgba(15,23,42,0.08)] backdrop-blur-xl lg:col-span-7 md:p-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.3em] text-emerald-700">
            Kutaksha Vision
          </div>
          <h2 className="mt-4 max-w-4xl text-3xl font-semibold leading-tight text-slate-900 md:text-5xl">
            Keeping seniors safe, independent, and connected through preventive intelligence.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-700 md:text-base">
            Healthcare systems are often reactive. Kutaksha predicts decline before emergencies by learning each patient&apos;s normal behavior and tracking long-term trajectory shifts with a privacy-preserving digital twin.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onNavigate('/demo')}
              className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-slate-900/15 transition hover:-translate-y-0.5 hover:bg-slate-800"
            >
              View Live Demo
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/platform')}
              className="rounded-xl border border-slate-300 bg-white/90 px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:-translate-y-0.5 hover:bg-slate-100"
            >
              Explore Platform
            </button>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {['Privacy-preserving', 'Clinical AI', 'Behavioral Trajectory', 'Caregiver Ready'].map((item) => (
              <span key={item} className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-[11px] font-medium text-slate-700">
                {item}
              </span>
            ))}
          </div>
        </article>

        <article className="rounded-[30px] border border-white/70 bg-[linear-gradient(145deg,rgba(255,255,255,0.96),rgba(254,249,195,0.78),rgba(236,253,245,0.92))] p-6 shadow-[0_25px_90px_rgba(15,23,42,0.08)] backdrop-blur-xl lg:col-span-5">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-600">Why This Matters</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm">
              <p className="text-2xl font-semibold text-slate-900">1 in 4</p>
              <p className="mt-1 text-xs text-slate-600">will be aged 65+ in many urban populations by 2030.</p>
            </div>
            <div className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm">
              <p className="text-2xl font-semibold text-slate-900">Early</p>
              <p className="mt-1 text-xs text-slate-600">subtle decline appears days before critical events.</p>
            </div>
            <div className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm">
              <p className="text-2xl font-semibold text-slate-900">Privacy</p>
              <p className="mt-1 text-xs text-slate-600">no cloud raw video storage in our architecture.</p>
            </div>
            <div className="rounded-2xl border border-white/80 bg-white/90 p-4 shadow-sm">
              <p className="text-2xl font-semibold text-slate-900">BHTE</p>
              <p className="mt-1 text-xs text-slate-600">Behavioral Health Trajectory Engine for forecasting.</p>
            </div>
          </div>
        </article>
      </section>

      <section className="mb-6 rounded-[30px] border border-white/70 bg-white/80 p-6 shadow-[0_25px_90px_rgba(15,23,42,0.08)] backdrop-blur-xl md:p-8">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Who We Are</p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-900">Preventive AI for eldercare teams and families</h3>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('/privacy')}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Privacy Principles
          </button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {featureCards.map((card) => (
            <article key={card.title} className="rounded-2xl border border-slate-200 bg-white/92 p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
              <h4 className="text-base font-semibold text-slate-900">{card.title}</h4>
              <p className="mt-2 text-sm leading-6 text-slate-700">{card.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mb-2 grid gap-4 lg:grid-cols-3">
        <article className="rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Step 1</p>
          <h4 className="mt-2 text-lg font-semibold text-slate-900">Learn Baseline</h4>
          <p className="mt-2 text-sm text-slate-700">Build patient-specific digital twin using passive behavioral data.</p>
        </article>
        <article className="rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Step 2</p>
          <h4 className="mt-2 text-lg font-semibold text-slate-900">Track Trajectory</h4>
          <p className="mt-2 text-sm text-slate-700">Continuously measure change in speed, activity, posture, and inactivity.</p>
        </article>
        <article className="rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl">
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Step 3</p>
          <h4 className="mt-2 text-lg font-semibold text-slate-900">Alert Early</h4>
          <p className="mt-2 text-sm text-slate-700">Generate explainable preventive risk signals before critical incidents.</p>
        </article>
      </section>
    </div>
  );
}
