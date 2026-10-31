import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { HsiRiskChart, MultiMetricGrid, buildTrendData } from '../components/LiveCharts';
import { ScoreCards, MetricsTable, InsightPanel, AlertBanner } from '../components/DashboardWidgets';
import { normalizeMetrics, checkDeviations, DEFAULT_BASELINE, hsiFromCurrent, riskFromCurrent } from '../utils/metrics';
import { getPatient, getPatientMetrics, getAlerts } from '../utils/storage';
import { downloadReport, downloadCSV } from '../utils/reports';

export default function CaretakerDashboard() {
  const { user } = useAuth();
  const patient = getPatient(user?.patientId || 'p1');
  const baseline = normalizeMetrics(patient?.baseline, DEFAULT_BASELINE);

  const [history, setHistory] = useState([]);
  const [current, setCurrent] = useState({ ...baseline });
  const [alerts, setAlerts] = useState([]);
  const [storedAlerts, setStoredAlerts] = useState([]);

  useEffect(() => {
    const pid = patient?.id || 'p1';
    const existing = getPatientMetrics(pid, 60);
    if (existing.length > 0) {
      setHistory(existing);
      setCurrent(existing[existing.length - 1]);
    }
    setStoredAlerts(getAlerts(pid));

    const interval = setInterval(() => {
      const latest = getPatientMetrics(pid, 60);
      if (latest.length > 0) {
        setHistory(latest);
        const latestMetric = latest[latest.length - 1];
        setCurrent(latestMetric);
        setAlerts(checkDeviations(latestMetric, baseline, 20));
      }
      setStoredAlerts(getAlerts(pid));
    }, 2000);

    return () => clearInterval(interval);
  }, [patient?.id, baseline]);

  const trendData = buildTrendData(history, baseline);
  const hsi = hsiFromCurrent(current, baseline);
  const risk = riskFromCurrent(current, baseline);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 md:px-6 lg:px-8 xl:px-10">
      <section className="rounded-[28px] border border-slate-200/80 bg-white/90 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.32em] text-amber-700">Caretaker Dashboard</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-900">Monitoring — {patient?.name}</h2>
            <p className="mt-1 text-xs text-slate-500">Alerts trigger when any metric deviates ≥20% from baseline</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => downloadReport(patient, current, baseline, history, user?.name)}
              className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
            >
              Download Report
            </button>
            <button
              type="button"
              onClick={() => downloadCSV(patient, history, baseline)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Export CSV
            </button>
          </div>
        </div>

        {(alerts.length > 0 || storedAlerts.filter((a) => !a.read).length > 0) && (
          <div className="mt-4 space-y-3">
            <AlertBanner alerts={alerts} />
            {storedAlerts.filter((a) => !a.read).length > 0 && (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Recent Alert History</h3>
                <ul className="mt-2 space-y-1">
                  {storedAlerts.filter((a) => !a.read).slice(0, 5).map((a) => (
                    <li key={a.id} className="text-xs text-slate-600">
                      <span className="font-medium text-slate-800">{new Date(a.timestamp).toLocaleTimeString()}</span> — {a.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <div className="mt-4">
          <ScoreCards current={current} baseline={baseline} />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="mb-2 text-sm font-semibold text-slate-900">Health Trend</h3>
            <HsiRiskChart data={trendData} />
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-4">
            <InsightPanel current={current} baseline={baseline} alerts={alerts} />
            <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
              <p className="text-xs text-slate-500">Patient Info</p>
              <p className="text-sm font-semibold text-slate-900">{patient?.name}, {patient?.age} yrs</p>
              <p className="text-xs text-slate-600">{patient?.condition}</p>
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-slate-500">HSI:</span> <span className="font-semibold">{hsi}</span></div>
                <div><span className="text-slate-500">Risk:</span> <span className="font-semibold">{risk}%</span></div>
              </div>
            </div>
          </article>
        </div>

        <div className="mt-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Live Metrics (auto-refreshes every 2s)</h3>
          <MultiMetricGrid history={history} baseline={baseline} />
        </div>

        <div className="mt-4">
          <article className="rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-slate-900">Metrics vs Baseline</h3>
            <div className="mt-3">
              <MetricsTable current={current} baseline={baseline} />
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
