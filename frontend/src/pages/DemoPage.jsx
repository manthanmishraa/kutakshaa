import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import CameraTracker from '../components/CameraTracker';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

const baseline = {
  walking_speed: 1.2,
  activity_level: 82,
};

const stableCurrent = {
  walking_speed: 1.15,
  activity_level: 78,
};

const declineCurrent = {
  walking_speed: 0.82,
  activity_level: 49,
};

const stableTrend = [
  { day: 'D1', hsi: 97, risk: 18 },
  { day: 'D2', hsi: 96, risk: 20 },
  { day: 'D3', hsi: 95, risk: 21 },
  { day: 'D4', hsi: 94, risk: 23 },
  { day: 'D5', hsi: 92, risk: 24 },
  { day: 'D6', hsi: 91, risk: 25 },
  { day: 'Today', hsi: 90, risk: 26 },
];

const declineTrend = [
  { day: 'D1', hsi: 96, risk: 22 },
  { day: 'D2', hsi: 90, risk: 30 },
  { day: 'D3', hsi: 84, risk: 38 },
  { day: 'D4', hsi: 77, risk: 48 },
  { day: 'D5', hsi: 71, risk: 57 },
  { day: 'D6', hsi: 66, risk: 66 },
  { day: 'Today', hsi: 61, risk: 78 },
];

function asNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeMetrics(input, fallback) {
  if (!input || typeof input !== 'object') return fallback;
  return {
    walking_speed: asNumber(input.walking_speed ?? input.walkingSpeed, fallback.walking_speed),
    activity_level: asNumber(input.activity_level ?? input.activity ?? input.activityLevel, fallback.activity_level),
  };
}

function normalizeTrend(input) {
  if (!Array.isArray(input)) return [];
  return input.map((item, index) => ({
    day: item.day ?? item.label ?? `D${index + 1}`,
    hsi: asNumber(item.hsi ?? item.health_stability ?? item.healthStability, 0),
    risk: asNumber(item.risk ?? item.risk_score ?? item.riskScore, 0),
  }));
}

function hsiFromCurrent(current, base) {
  const speedDrop = Math.max(0, (base.walking_speed - current.walking_speed) / base.walking_speed);
  const activityDrop = Math.max(0, (base.activity_level - current.activity_level) / base.activity_level);
  const score = 100 - speedDrop * 45 - activityDrop * 35;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function riskFromCurrent(current, base) {
  let risk = 0;
  if (current.walking_speed < base.walking_speed * 0.85) risk += 30;
  if (current.activity_level < base.activity_level * 0.7) risk += 25;
  if (current.walking_speed < base.walking_speed * 0.75) risk += 15;
  return Math.min(100, risk);
}

function metricChange(current, base) {
  return Math.round(((current - base) / base) * 100);
}

function riskLabel(score) {
  if (score >= 70) return 'High';
  if (score >= 40) return 'Medium';
  return 'Low';
}

function trendLabel(change, reverse = false) {
  const good = reverse ? change > 0 : change < 0;
  if (good) return 'text-emerald-300';
  return 'text-rose-300';
}

async function postFrame(imageData) {
  if (!API_BASE) return null;
  const response = await fetch(`${API_BASE}/api/detect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: imageData }),
  });
  if (!response.ok) throw new Error('detect request failed');
  return response.json();
}

async function fetchJson(path, options = {}) {
  if (!API_BASE) return null;
  const response = await fetch(`${API_BASE}${path}`, options);
  if (!response.ok) throw new Error(`request failed: ${path}`);
  return response.json();
}

export default function DemoPage() {
  const [isSimulated, setIsSimulated] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [detectStatus, setDetectStatus] = useState('No frame analyzed yet.');
  const [fingerSpeed, setFingerSpeed] = useState(0);
  const [llmSummary, setLlmSummary] = useState('Generating preventive insight...');
  const [liveTwin, setLiveTwin] = useState(null);
  const [liveTrend, setLiveTrend] = useState([]);
  const [liveRisk, setLiveRisk] = useState(null);
  const [featureSnapshot, setFeatureSnapshot] = useState(null);
  const [dataMode, setDataMode] = useState(API_BASE ? 'backend' : 'demo');

  const speedBuffer = useRef([]);

  const handleSpeedUpdate = useCallback((speed) => {
    setFingerSpeed(speed);
    if (speed > 0) {
       speedBuffer.current.push(speed);
       if (speedBuffer.current.length > 15) speedBuffer.current.shift();
    } else {
       if (speedBuffer.current.length > 0) speedBuffer.current.shift();
    }

    if (speedBuffer.current.length === 0) return;

    const avgSpeed = speedBuffer.current.reduce((a, b) => a + b, 0) / speedBuffer.current.length;
    
    // Trigger decline if speed drops below 0.8
    if (avgSpeed < 0.8 && avgSpeed > 0) {
      if (!isSimulated) {
        setIsSimulated(true);
      }
    } else if (avgSpeed >= 1.0) {
      if (isSimulated) {
        setIsSimulated(false);
      }
    }
  }, [isSimulated]);

  const baselineData = normalizeMetrics(liveTwin?.baseline, baseline);
  
  // Update fallback current based on finger speed when available
  const activeSpeed = fingerSpeed > 0 ? fingerSpeed : (isSimulated ? declineCurrent.walking_speed : stableCurrent.walking_speed);
  
  const fallbackCurrent = isSimulated ? { ...declineCurrent, walking_speed: activeSpeed } : { ...stableCurrent, walking_speed: activeSpeed };
  const currentData = normalizeMetrics(liveTwin?.current, fallbackCurrent);
  const trend = liveTrend.length > 0 ? liveTrend : (isSimulated ? declineTrend : stableTrend);
  const computedHsi = hsiFromCurrent(currentData, baselineData);
  const computedRisk = riskFromCurrent(currentData, baselineData);
  const healthStability = asNumber(liveRisk?.health_stability ?? liveTwin?.health_stability, computedHsi);
  const riskScore = asNumber(liveRisk?.risk_score ?? liveTwin?.risk_score, computedRisk);

  const changeSet = useMemo(() => {
    return {
      walking: metricChange(currentData.walking_speed, baselineData.walking_speed),
      activity: metricChange(currentData.activity_level, baselineData.activity_level),
    };
  }, [currentData, baselineData]);

  const summary = riskScore >= 70
    ? 'Sustained downward trend detected in walking speed and activity. Mobility decline is becoming more pronounced.'
    : 'Behavior remains near baseline with no sustained decline trajectory.';

  useEffect(() => {
    let mounted = true;
    async function loadExplanation() {
      if (!API_BASE) {
        if (mounted) {
          setLlmSummary(
            riskScore >= 70
              ? 'Walking speed and activity are significantly below baseline. Recommend proactive caregiver intervention.'
              : 'Current behavior remains close to baseline. Continue regular preventive monitoring.'
          );
        }
        return;
      }
      try {
        const response = await fetchJson('/api/explain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ baseline: baselineData, current: currentData, health_stability: healthStability, risk_score: riskScore }),
        });
        if (mounted) {
          setLlmSummary(response?.explanation || 'AI explanation unavailable.');
        }
      } catch (_error) {
        if (mounted) setLlmSummary('AI explanation service unavailable.');
      }
    }
    loadExplanation();
    return () => { mounted = false; };
  }, [baselineData, currentData, healthStability, riskScore]);

  useEffect(() => {
    let mounted = true;
    async function syncTwinData() {
      if (!API_BASE) return;
      try {
        if (isSimulated) {
          await fetchJson('/api/simulate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ days: 7, mode: 'decline' }),
          });
        }
        const twin = await fetchJson('/api/digital-twin');
        if (!mounted || !twin) return;
        setLiveTwin(twin);
        setLiveTrend(normalizeTrend(twin.timeline ?? twin.trend ?? twin.history));
        setLiveRisk({
          health_stability: asNumber(twin.health_stability ?? twin.healthStability, 0),
          risk_score: asNumber(twin.risk_score ?? twin.riskScore, 0),
        });
        setDataMode('backend');
      } catch (_error) {
        if (mounted) setDataMode('demo');
      }
    }
    syncTwinData();
    return () => { mounted = false; };
  }, [isSimulated]);

  const handleAnalyze = async () => {
    // Disabled manual analysis since we are using continuous tracking
    setDetectStatus('Using continuous local AI tracking via MediaPipe.');
  };



  return (
    <div className="mx-auto w-full max-w-7xl px-4 md:px-6 lg:px-8 xl:px-10">
      <section className="rounded-3xl border border-slate-200 bg-white/85 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-slate-500">Live Prototype</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-900">Kutaksha Demo Dashboard</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setIsSimulated((v) => !v)}
              className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800"
            >
              {isSimulated ? 'Show Baseline' : 'Simulate Decline'}
            </button>
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
            >
              {isAnalyzing ? 'Analyzing...' : 'Continuous Tracking Active'}
            </button>
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-black">
              <CameraTracker onSpeedUpdate={handleSpeedUpdate} />
            </div>
            <p className="mt-2 text-xs text-slate-600 font-medium text-emerald-600">{fingerSpeed > 0 ? `Tracking Fingers! Speed: ${fingerSpeed.toFixed(2)}` : 'Waiting for hand in frame...'}</p>
            <p className="mt-1 text-xs text-slate-500">Data source: Local MediaPipe Edge AI</p>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.3)" />
                  <XAxis dataKey="day" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} />
                  <Tooltip />
                  <Line dataKey="hsi" stroke="#0ea5e9" strokeWidth={2.4} dot={false} name="Health Stability" />
                  <Line dataKey="risk" stroke="#fb7185" strokeWidth={2.4} dot={false} name="Risk Score" />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-center">
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">HSI</p>
                <p className="text-lg font-semibold text-slate-900">{healthStability}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-center">
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Risk</p>
                <p className="text-lg font-semibold text-slate-900">{riskScore}%</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-center">
                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">Level</p>
                <p className="text-lg font-semibold text-slate-900">{riskLabel(riskScore)}</p>
              </div>
            </div>
          </article>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <article className="rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="text-base font-semibold text-slate-900">Digital Twin Metrics</h3>
            <div className="mt-3 overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="px-3 py-2">Metric</th>
                    <th className="px-3 py-2">Baseline</th>
                    <th className="px-3 py-2">Current</th>
                    <th className="px-3 py-2">Delta</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-slate-200 text-slate-700">
                    <td className="px-3 py-2">Walking Speed</td>
                    <td className="px-3 py-2">{baselineData.walking_speed.toFixed(2)} m/s</td>
                    <td className="px-3 py-2">{currentData.walking_speed.toFixed(2)} m/s</td>
                    <td className={`px-3 py-2 font-semibold ${trendLabel(changeSet.walking)}`}>{changeSet.walking}%</td>
                  </tr>
                  <tr className="border-t border-slate-200 text-slate-700">
                    <td className="px-3 py-2">Activity</td>
                    <td className="px-3 py-2">{baselineData.activity_level}%</td>
                    <td className="px-3 py-2">{currentData.activity_level}%</td>
                    <td className={`px-3 py-2 font-semibold ${trendLabel(changeSet.activity)}`}>{changeSet.activity}%</td>
                  </tr>

                </tbody>
              </table>
            </div>
          </article>

          <article className="rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="text-base font-semibold text-slate-900">Explainable Insight</h3>
            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm text-slate-700">{summary}</p>
              <p className="mt-3 text-sm text-slate-700">{llmSummary}</p>
            </div>
            {featureSnapshot && (
              <p className="mt-3 text-xs text-slate-600">
                Latest features: speed {asNumber(featureSnapshot.walking_speed ?? featureSnapshot.walkingSpeed, currentData.walking_speed).toFixed(2)} m/s, activity {asNumber(featureSnapshot.activity_level ?? featureSnapshot.activityLevel ?? featureSnapshot.activity, currentData.activity_level)}%.
              </p>
            )}
          </article>
        </div>
      </section>
    </div>
  );
}
