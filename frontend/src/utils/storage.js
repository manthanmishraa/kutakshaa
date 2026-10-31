import { DEFAULT_BASELINE, normalizeMetrics } from './metrics';

const KEYS = {
  USERS: 'kutaksha_users',
  SESSION: 'kutaksha_session',
  PATIENTS: 'kutaksha_patients',
  METRICS: 'kutaksha_metrics',
  ALERTS: 'kutaksha_alerts',
};

const DEMO_USERS = [
  { id: 'u1', email: 'patient@kutaksha.com', password: 'patient123', role: 'patient', name: 'Rajesh Kumar', patientId: 'p1' },
  { id: 'u2', email: 'caretaker@kutaksha.com', password: 'caret123', role: 'caretaker', name: 'Priya Sharma', patientId: 'p1' },
  { id: 'u3', email: 'doctor@kutaksha.com', password: 'doc123', role: 'doctor', name: 'Dr. Ananya Mehta' },
];

const DEMO_PATIENTS = [
  {
    id: 'p1',
    name: 'Rajesh Kumar',
    age: 72,
    condition: 'Mild mobility decline',
    previousMedicalConditions: [
      { condition: 'Hypertension', diagnosed: '2016', status: 'Controlled with ongoing treatment' },
      { condition: 'Type 2 diabetes', diagnosed: '2018', status: 'Managed with medication and diet' },
      { condition: 'Bilateral knee osteoarthritis', diagnosed: '2021', status: 'Intermittent pain affecting mobility' },
      { condition: 'Fall with minor hip injury', diagnosed: '2023', status: 'Recovered; fall-risk monitoring advised' },
    ],
    caretakerId: 'u2',
    doctorId: 'u3',
    baseline: { ...DEFAULT_BASELINE },
  },
  { id: 'p2', name: 'Lakshmi Devi', age: 68, condition: 'Post-stroke recovery', caretakerId: null, doctorId: 'u3', baseline: { walking_speed: 0.95, activity_level: 65, sitting_minutes: 72, balance_score: 62, tremor_index: 18, gait_rhythm: 70 } },
  { id: 'p3', name: 'Suresh Patel', age: 75, condition: 'Parkinson\'s monitoring', caretakerId: null, doctorId: 'u3', baseline: { walking_speed: 0.88, activity_level: 58, sitting_minutes: 85, balance_score: 55, tremor_index: 28, gait_rhythm: 62 } },
];

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function initStorage() {
  if (!read(KEYS.USERS)) write(KEYS.USERS, DEMO_USERS);
  if (!read(KEYS.PATIENTS)) write(KEYS.PATIENTS, DEMO_PATIENTS);

  // Keep the demo session clean so stale simulation data is not replayed on refresh.
  write(KEYS.METRICS, {});
  write(KEYS.ALERTS, []);
}

export function login(email, password) {
  const users = read(KEYS.USERS, DEMO_USERS);
  const user = users.find((u) => u.email === email && u.password === password);
  if (!user) return null;
  const session = { id: user.id, email: user.email, role: user.role, name: user.name, patientId: user.patientId };
  write(KEYS.SESSION, session);
  return session;
}

export function logout() {
  localStorage.removeItem(KEYS.SESSION);
}

export function getSession() {
  return read(KEYS.SESSION, null);
}

export function getPatients() {
  return read(KEYS.PATIENTS, DEMO_PATIENTS);
}

export function getPatient(id) {
  return getPatients().find((p) => p.id === id) || null;
}

export function savePatientMetrics(patientId, metrics) {
  const all = read(KEYS.METRICS, {});
  const history = all[patientId] || [];
  const entry = { ...normalizeMetrics(metrics), timestamp: Date.now() };
  history.push(entry);
  if (history.length > 500) history.splice(0, history.length - 500);
  all[patientId] = history;
  write(KEYS.METRICS, all);
  return entry;
}

export function getPatientMetrics(patientId, limit = 100) {
  const all = read(KEYS.METRICS, {});
  const history = all[patientId] || [];
  return history.slice(-limit);
}

export function getLatestMetrics(patientId) {
  const history = getPatientMetrics(patientId, 1);
  return history.length > 0 ? history[history.length - 1] : null;
}

export function saveAlert(alert) {
  const alerts = read(KEYS.ALERTS, []);
  alerts.unshift({ ...alert, id: `a${Date.now()}`, timestamp: Date.now(), read: false });
  if (alerts.length > 200) alerts.splice(200);
  write(KEYS.ALERTS, alerts);
}

export function getAlerts(patientId = null) {
  const alerts = read(KEYS.ALERTS, []);
  if (!patientId) return alerts;
  return alerts.filter((a) => a.patientId === patientId);
}

export function markAlertRead(alertId) {
  const alerts = read(KEYS.ALERTS, []);
  const idx = alerts.findIndex((a) => a.id === alertId);
  if (idx >= 0) alerts[idx].read = true;
  write(KEYS.ALERTS, alerts);
}

export function updatePatientBaseline(patientId, baseline) {
  const patients = getPatients();
  const idx = patients.findIndex((p) => p.id === patientId);
  if (idx >= 0) {
    patients[idx].baseline = { ...patients[idx].baseline, ...baseline };
    write(KEYS.PATIENTS, patients);
  }
}
