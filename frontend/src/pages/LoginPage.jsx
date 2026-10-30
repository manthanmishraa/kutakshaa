import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const DEMO_ACCOUNTS = [
  { email: 'patient@kutaksha.com', password: 'patient123', role: 'Patient', color: 'emerald' },
  { email: 'caretaker@kutaksha.com', password: 'caret123', role: 'Caretaker', color: 'amber' },
  { email: 'doctor@kutaksha.com', password: 'doc123', role: 'Doctor', color: 'sky' },
];

export default function LoginPage({ onNavigate }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const session = await login(email, password);
    if (session) {
      const routes = { patient: '/dashboard/patient', caretaker: '/dashboard/caretaker', doctor: '/dashboard/doctor' };
      onNavigate(routes[session.role] || '/');
    } else {
      setError('Invalid email or password');
    }
    setLoading(false);
  };

  const quickLogin = async (account) => {
    setEmail(account.email);
    setPassword(account.password);
    const session = await login(account.email, account.password);
    if (session) {
      const routes = { patient: '/dashboard/patient', caretaker: '/dashboard/caretaker', doctor: '/dashboard/doctor' };
      onNavigate(routes[session.role] || '/');
    }
  };

  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-lg flex-col justify-center px-4">
      <div className="rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <div className="mb-6 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-teal-700">Kutaksha</p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-900">Sign In</h2>
          <p className="mt-2 text-sm text-slate-600">Access your role-based health monitoring dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              placeholder="you@example.com"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20"
              placeholder="••••••••"
              required
            />
          </div>

          {error && <p className="text-sm text-rose-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-slate-900 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 border-t border-slate-200 pt-6">
          <p className="mb-3 text-center text-xs font-medium text-slate-500">Quick Demo Login</p>
          <div className="grid gap-2">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.role}
                type="button"
                onClick={() => quickLogin(acc)}
                className={`rounded-lg border px-3 py-2 text-left text-xs transition hover:shadow-sm border-${acc.color}-200 bg-${acc.color}-50 text-${acc.color}-800`}
                style={{
                  borderColor: acc.color === 'emerald' ? '#a7f3d0' : acc.color === 'amber' ? '#fde68a' : '#bae6fd',
                  backgroundColor: acc.color === 'emerald' ? '#ecfdf5' : acc.color === 'amber' ? '#fffbeb' : '#f0f9ff',
                  color: acc.color === 'emerald' ? '#065f46' : acc.color === 'amber' ? '#92400e' : '#0c4a6e',
                }}
              >
                <span className="font-semibold">{acc.role}</span>
                <span className="ml-2 text-[10px] opacity-70">{acc.email}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
