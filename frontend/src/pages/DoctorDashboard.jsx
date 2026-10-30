import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ScoreCards, MetricsTable, AlertBanner } from '../components/DashboardWidgets';
import { HsiRiskChart, buildTrendData } from '../components/LiveCharts';
import { normalizeMetrics, checkDeviations, DEFAULT_BASELINE, hsiFromCurrent, riskFromCurrent, riskLabel } from '../utils/metrics';
import { getPatients, getPatientMetrics, getLatestMetrics } from '../utils/storage';
import { downloadReport, downloadCSV } from '../utils/reports';

function PatientCard({ patient, onSelect, selected }) {
  const latest = getLatestMetrics(patient.id);
  const baseline = normalizeMetrics(patient.baseline, DEFAULT_BASELINE);
  const current = latest ? normalizeMetrics(latest, baseline) : baseline;
  const hsi = hsiFromCurrent(current, baseline);
  const risk = riskFromCurrent(current, baseline);
  const alerts = checkDeviations(current, baseline, 20);

  return (
    <button
      type="button"
      onClick={() => onSelect(patient.id)}
      className={`w-full rounded-xl border p-4 text-left transition hover:shadow-md ${selected ? 'border-sky-400 bg-sky-50 ring-2 ring-sky-200' : 'border-slate-200 bg-white'}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-slate-900">{patient.name}</p>
          <p className="text-xs text-slate-500">{patient.age} yrs — {patient.condition}</p>
        </div>
        <div className="text-right">
          <p className={`text-lg font-bold ${risk >= 70 ? 'text-rose-600' : risk >= 40 ? 'text-amber-600' : 'text-emerald-600'}`}>{riskLabel(risk)}</p>
          <p className="text-[10px] text-slate-500">HSI {hsi}</p>
        </div>
      </div>
      {alerts.length > 0 && (
        <div className="mt-2 flex items-center gap-1">
          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">{alerts.length} alert{alerts.length > 1 ? 's' : ''}</span>
        </div>
      )}
      {!latest && (
        <p className="mt-2 text-[10px] text-slate-400">No tracking data yet</p>
      )}
    </button>
  );
}

export default function DoctorDashboard() {
  const { user } = useAuth();
  const patients = getPatients();
  const [selectedId, setSelectedId] = useState(patients[0]?.id || 'p1');
  const [history, setHistory] = useState([]);

  const patient = patients.find((p) => p.id === selectedId);
  const baseline = normalizeMetrics(patient?.baseline, DEFAULT_BASELINE);
  const latest = getLatestMetrics(selectedId);
  const current = latest ? normalizeMetrics(latest, baseline) : { ...baseline };
  const alerts = checkDeviations(current, baseline, 20);

  useEffect(() => {
    const existing = getPatientMetrics(selectedId, 60);
    setHistory(existing);

    const interval = setInterval(() => {
      setHistory(getPatientMetrics(selectedId, 60));
    }, 3000);
    return () => clearInterval(interval);
  }, [selectedId]);

  const trendData = buildTrendData(history, baseline);

  const allPatientsSummary = patients.map((p) => {
    const bl = normalizeMetrics(p.baseline, DEFAULT_BASELINE);
    const lat = getLatestMetrics(p.id);
    const cur = lat ? normalizeMetrics(lat, bl) : bl;
    return {
      ...p,
      hsi: hsiFromCurrent(cur, bl),
      risk: riskFromCurrent(cur, bl),
      alertCount: checkDeviations(cur, bl, 20).length,
      hasData: !!lat,
    };
  });

  return (
    <div className="mx-auto w-full max-w-7xl px-4 md:px-6 lg:px-8 xl:px-10">
      <section className="rounded-[28px] border border-slate-200/80 bg-white/90 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.32em] text-sky-700">Doctor Dashboard</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-900">All Patients — AI Tracker Overview</h2>
            <p className="mt-1 text-xs text-slate-500">Dr. {user?.name?.replace('Dr. ', '')} — {patients.length} patients registered</p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {allPatientsSummary.map((p) => (
            <div key={p.id} className="rounded-xl border border-slate-200 bg-white p-3 text-center">
              <p className="text-xs font-medium text-slate-700">{p.name}</p>
              <p className={`mt-1 text-xl font-bold ${p.risk >= 70 ? 'text-rose-600' : p.risk >= 40 ? 'text-amber-600' : 'text-emerald-600'}`}>{p.risk}%</p>
              <p className="text-[10px] text-slate-500">Risk · HSI {p.hsi}{p.alertCount > 0 ? ` · ${p.alertCount} alerts` : ''}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="space-y-2 lg:col-span-1">
            <h3 className="text-sm font-semibold text-slate-900">Select Patient</h3>
            {patients.map((p) => (
              <PatientCard key={p.id} patient={p} onSelect={setSelectedId} selected={selectedId === p.id} />
            ))}
          </div>

          <div className="space-y-4 lg:col-span-2">
            {patient && (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-lg font-semibold text-slate-900">{patient.name} — Detailed View</h3>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => downloadReport(patient, current, baseline, history, user?.name)}
                      className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                    >
                      Download Report
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadCSV(patient, history, baseline)}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Export CSV
                    </button>
                  </div>
                </div>

                {alerts.length > 0 && <AlertBanner alerts={alerts} />}

                <ScoreCards current={current} baseline={baseline} />

                <article className="rounded-2xl border border-slate-200 bg-white p-4">
                  <h3 className="mb-2 text-sm font-semibold text-slate-900">Health Trend</h3>
                  <HsiRiskChart data={trendData} />
                </article>

                <article className="rounded-2xl border border-slate-200 bg-white p-4">
                  <h3 className="text-sm font-semibold text-slate-900">Full Metrics</h3>
                  <div className="mt-3">
                    <MetricsTable current={current} baseline={baseline} />
                  </div>
                </article>
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
