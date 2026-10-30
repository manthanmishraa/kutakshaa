import { hsiFromCurrent, riskFromCurrent, severityFromCurrent, riskLabel, METRIC_LABELS, metricChange, trendLabel } from '../utils/metrics';

export function AlertBanner({ alerts }) {
  if (!alerts?.length) return null;

  const critical = alerts.filter((a) => a.severity === 'critical');
  const warnings = alerts.filter((a) => a.severity !== 'critical');

  return (
    <div className="space-y-2">
      {critical.map((a, i) => (
        <div key={`c-${i}`} className="flex items-start gap-3 rounded-2xl border border-rose-300 bg-[linear-gradient(135deg,rgba(255,241,242,0.95),rgba(254,226,226,0.98))] p-4 shadow-sm">
          <span className="mt-0.5 text-lg">🚨</span>
          <div>
            <p className="text-sm font-semibold text-rose-900">Critical Alert — {a.label}</p>
            <p className="mt-1 text-xs text-rose-800">{a.message}</p>
          </div>
        </div>
      ))}
      {warnings.map((a, i) => (
        <div key={`w-${i}`} className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-[linear-gradient(135deg,rgba(255,251,235,0.96),rgba(254,243,199,0.97))] p-4 shadow-sm">
          <span className="mt-0.5 text-lg">⚠️</span>
          <div>
            <p className="text-sm font-semibold text-amber-900">{a.severity === 'warning' ? 'Warning' : 'Caution'} — {a.label}</p>
            <p className="mt-1 text-xs text-amber-800">{a.message}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function MetricsTable({ current, baseline }) {
  const keys = Object.keys(METRIC_LABELS);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-900 text-slate-100">
          <tr>
            <th className="px-3 py-2.5 font-semibold">Metric</th>
            <th className="px-3 py-2.5 font-semibold">Baseline</th>
            <th className="px-3 py-2.5 font-semibold">Current</th>
            <th className="px-3 py-2.5 font-semibold">Delta</th>
            <th className="px-3 py-2.5 font-semibold">Status</th>
          </tr>
        </thead>
        <tbody>
          {keys.map((key) => {
            const meta = METRIC_LABELS[key];
            const curr = current[key];
            const base = baseline[key];
            const change = metricChange(curr, base);
            const dev = Math.abs(change);
            const status = dev >= 40 ? 'critical' : dev >= 20 ? 'warning' : 'normal';

            return (
              <tr key={key} className="border-t border-slate-200 text-slate-700">
                <td className="px-3 py-2.5 font-medium">{meta.label}</td>
                <td className="px-3 py-2.5">{base.toFixed(meta.decimals)}{meta.unit ? ' ' + meta.unit : ''}</td>
                <td className="px-3 py-2.5 font-semibold">{curr.toFixed(meta.decimals)}{meta.unit ? ' ' + meta.unit : ''}</td>
                <td className={`px-3 py-2.5 font-semibold ${trendLabel(change)}`}>
                  {change > 0 ? '+' : ''}{change}%
                </td>
                <td className="px-3 py-2.5">
                  {status === 'critical' && <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">CRITICAL</span>}
                  {status === 'warning' && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">WARNING</span>}
                  {status === 'normal' && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">NORMAL</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function ScoreCards({ current, baseline }) {
  const hsi = hsiFromCurrent(current, baseline);
  const risk = riskFromCurrent(current, baseline);
  const severity = severityFromCurrent(current, baseline);

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <div className="rounded-2xl border border-sky-200 bg-[linear-gradient(135deg,rgba(239,246,255,0.98),rgba(255,255,255,1))] p-4 text-center shadow-sm">
        <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">HSI</p>
        <p className="mt-1 text-2xl font-bold text-sky-700">{hsi}</p>
        <p className="text-[10px] text-slate-500">Health Stability</p>
      </div>
      <div className="rounded-2xl border border-rose-200 bg-[linear-gradient(135deg,rgba(255,241,242,0.98),rgba(255,255,255,1))] p-4 text-center shadow-sm">
        <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Risk</p>
        <p className="mt-1 text-2xl font-bold text-rose-700">{risk}%</p>
        <p className="text-[10px] text-slate-500">Risk Score</p>
      </div>
      <div className="rounded-2xl border border-amber-200 bg-[linear-gradient(135deg,rgba(255,251,235,0.98),rgba(255,255,255,1))] p-4 text-center shadow-sm">
        <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Severity</p>
        <p className="mt-1 text-2xl font-bold text-amber-700">{severity}</p>
        <p className="text-[10px] text-slate-500">AI Severity Index</p>
      </div>
      <div className={`rounded-2xl border p-4 text-center shadow-sm ${risk >= 70 ? 'border-rose-300 bg-rose-50' : risk >= 40 ? 'border-amber-300 bg-amber-50' : 'border-emerald-300 bg-emerald-50'}`}>
        <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Level</p>
        <p className="mt-1 text-2xl font-bold">{riskLabel(risk)}</p>
        <p className="text-[10px] text-slate-500">Assessment</p>
      </div>
    </div>
  );
}

export function InsightPanel({ current, baseline, alerts }) {
  const hsi = hsiFromCurrent(current, baseline);
  const risk = riskFromCurrent(current, baseline);
  const severity = severityFromCurrent(current, baseline);

  let summary = 'All metrics are within normal range. Continue regular monitoring.';
  if (alerts?.length > 0) {
    const criticalCount = alerts.filter((a) => a.severity === 'critical').length;
    if (criticalCount > 0) {
      summary = `${criticalCount} critical deviation(s) detected. Immediate caregiver attention recommended.`;
    } else {
      summary = `${alerts.length} metric(s) deviating ≥20% from baseline. Review recommended.`;
    }
  } else if (severity >= 70 || risk >= 70) {
    summary = 'AI severity composite is elevated because mobility and behavioral consistency are trending away from the patient baseline.';
  } else if (hsi < 70) {
    summary = 'Health stability index declining. Monitor walking speed, balance, and activity consistency closely.';
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <h3 className="text-sm font-semibold text-slate-900">AI Insight</h3>
      <p className="mt-2 text-sm text-slate-700">{summary}</p>
      {alerts?.length > 0 && (
        <ul className="mt-3 space-y-1">
          {alerts.slice(0, 5).map((a, i) => (
            <li key={i} className="text-xs text-slate-600">• {a.message}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
