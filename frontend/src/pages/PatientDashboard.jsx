import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import CameraTracker from '../components/CameraTracker';
import { HsiRiskChart, MultiMetricGrid, buildTrendData } from '../components/LiveCharts';
import { ScoreCards, MetricsTable, InsightPanel, AlertBanner } from '../components/DashboardWidgets';
import { normalizeMetrics, checkDeviations, sustainedDeviations, DEFAULT_BASELINE } from '../utils/metrics';
import { getPatient, savePatientMetrics, getPatientMetrics, saveAlert } from '../utils/storage';

export default function PatientDashboard() {
  const { user } = useAuth();
  const patient = getPatient(user?.patientId || 'p1');
  const baseline = normalizeMetrics(patient?.baseline, DEFAULT_BASELINE);

  const [current, setCurrent] = useState({ ...baseline });
  const [history, setHistory] = useState([]);
  const [tracking, setTracking] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const saveTimerRef = useRef(null);
  const lastAlertRef = useRef({});
  const historyRef = useRef([]);

  useEffect(() => {
    const existing = getPatientMetrics(patient?.id || 'p1', 60);
    historyRef.current = existing;
    if (existing.length > 0) {
      setHistory(existing);
      setCurrent(existing[existing.length - 1]);
    }
  }, [patient?.id]);

  const handleMetricsUpdate = useCallback((metrics) => {
    const normalized = normalizeMetrics({
      walking_speed: metrics.walkingSpeed,
      activity_level: metrics.activityLevel,
      sitting_minutes: metrics.sittingMinutes,
      balance_score: metrics.balanceScore,
      tremor_index: metrics.tremorIndex,
      gait_rhythm: metrics.gaitRhythm,
    }, baseline);

    setCurrent(normalized);
    setTracking(true);

    const stableHistory = [...historyRef.current.slice(-3), normalized];
    const newAlerts = sustainedDeviations(stableHistory, baseline, 20, 4);
    setAlerts(newAlerts);

    for (const alert of newAlerts) {
      const key = `${alert.metric}-${alert.direction}`;
      const now = Date.now();
      if (!lastAlertRef.current[key] || now - lastAlertRef.current[key] > 30000) {
        lastAlertRef.current[key] = now;
        saveAlert({ ...alert, patientId: patient?.id, patientName: patient?.name });
      }
    }

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const entry = savePatientMetrics(patient?.id || 'p1', normalized);
      const nextHistory = [...historyRef.current.slice(-59), entry];
      historyRef.current = nextHistory;
      setHistory(nextHistory);
    }, 500);
  }, [baseline, patient]);

  const trendData = buildTrendData(history, baseline);

  return (
    <div className="mx-auto w-full max-w-7xl px-4 md:px-6 lg:px-8 xl:px-10">
      <section className="rounded-[28px] border border-slate-200/80 bg-white/90 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.32em] text-emerald-700">Patient Dashboard</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-900">AI Health Tracking — {patient?.name}</h2>
            <p className="mt-1 text-xs text-slate-500">{tracking ? 'Live walking-focused tracking active — mobility metrics updating in real time' : 'Enable camera access to start live walking analysis'}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${tracking ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
              <span className={`h-2 w-2 rounded-full ${tracking ? 'animate-pulse bg-emerald-500' : 'bg-slate-400'}`} />
              {tracking ? 'Tracking' : 'Idle'}
            </span>
          </div>
        </div>

        {alerts.length > 0 && (
          <div className="mt-4">
            <AlertBanner alerts={alerts} />
          </div>
        )}

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-4">
            <CameraTracker onMetricsUpdate={handleMetricsUpdate} />
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="mb-2 text-sm font-semibold text-slate-900">Health Stability &amp; Risk Trend</h3>
            <HsiRiskChart data={trendData} />
            <div className="mt-3">
              <ScoreCards current={current} baseline={baseline} />
            </div>
          </article>
        </div>

        <div className="mt-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Live Metric Charts (with ±20% baseline bands)</h3>
          <MultiMetricGrid history={history} baseline={baseline} />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-slate-900">Digital Twin Metrics</h3>
            <div className="mt-3">
              <MetricsTable current={current} baseline={baseline} />
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-4">
            <InsightPanel current={current} baseline={baseline} alerts={alerts} />
          </article>
        </div>
      </section>
    </div>
  );
}
