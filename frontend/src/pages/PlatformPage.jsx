const modules = [
  {
    title: 'Live Camera + Person Detection',
    points: ['Webcam capture', 'YOLO person check', 'Confidence-based gating'],
  },
  {
    title: 'Pose + Feature Extraction',
    points: ['33 pose landmarks', 'Walking speed estimation', 'Activity and mobility metrics'],
  },
  {
    title: 'Digital Twin + Comparison',
    points: ['Patient-specific baseline profile', 'Current vs baseline deltas', 'Trend-aware trajectory map'],
  },
  {
    title: 'Risk + Explainability',
    points: ['Health Stability Index', 'Rule-based risk engine', 'LLM-generated preventive explanation'],
  },
];

export default function PlatformPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 md:px-6 lg:px-8 xl:px-10">
      <section className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl md:p-8">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Platform Overview</p>
        <h2 className="mt-2 text-3xl font-semibold text-slate-900">End-to-end preventive healthcare architecture</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-700">
          Kutaksha transforms visual behavioral signals into actionable preventive intelligence through a modular pipeline.
        </p>
      </section>

      <section className="mt-4 grid gap-4 md:grid-cols-2">
        {modules.map((module) => (
          <article key={module.title} className="rounded-2xl border border-slate-200 bg-white/85 p-5 shadow-[0_10px_25px_rgba(15,23,42,0.06)]">
            <h3 className="text-lg font-semibold text-slate-900">{module.title}</h3>
            <ul className="mt-3 space-y-2 text-sm text-slate-700">
              {module.points.map((point) => (
                <li key={point}>• {point}</li>
              ))}
            </ul>
          </article>
        ))}
      </section>
    </div>
  );
}
