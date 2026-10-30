const stack = [
  { area: 'Frontend', tools: 'React, Tailwind CSS, Recharts' },
  { area: 'Backend', tools: 'FastAPI, Pydantic, Uvicorn' },
  { area: 'Computer Vision', tools: 'YOLO (Ultralytics), MediaPipe Pose, OpenCV' },
  { area: 'AI Explainability', tools: 'Google Gemini API' },
  { area: 'Storage & Deployment', tools: 'Firebase, Vercel, Render/Railway' },
];

const endpoints = [
  ['POST', '/api/detect', 'Run YOLO + pose extraction'],
  ['POST', '/api/features', 'Compute behavior metrics from landmarks'],
  ['POST', '/api/risk', 'Compute HSI + risk score'],
  ['GET', '/api/digital-twin', 'Fetch patient digital twin state'],
  ['POST', '/api/explain', 'Generate preventive AI explanation'],
  ['POST', '/api/simulate', 'Generate synthetic decline trajectory'],
];

export default function TechnologyPage() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 md:px-6 lg:px-8 xl:px-10">
      <section className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl md:p-8">
        <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Technology</p>
        <h2 className="mt-2 text-3xl font-semibold text-slate-900">Modern web + AI stack for preventive monitoring</h2>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-slate-200 bg-white/85 p-5">
          <h3 className="text-lg font-semibold text-slate-900">Stack</h3>
          <div className="mt-3 space-y-2">
            {stack.map((item) => (
              <div key={item.area} className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{item.area}</p>
                <p className="mt-1 text-sm text-slate-700">{item.tools}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white/85 p-5">
          <h3 className="text-lg font-semibold text-slate-900">API Surface</h3>
          <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="px-3 py-2 font-semibold">Method</th>
                  <th className="px-3 py-2 font-semibold">Endpoint</th>
                  <th className="px-3 py-2 font-semibold">Purpose</th>
                </tr>
              </thead>
              <tbody>
                {endpoints.map(([method, path, purpose]) => (
                  <tr key={path} className="border-t border-slate-200 text-slate-700">
                    <td className="px-3 py-2 font-semibold">{method}</td>
                    <td className="px-3 py-2">{path}</td>
                    <td className="px-3 py-2">{purpose}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </div>
  );
}
