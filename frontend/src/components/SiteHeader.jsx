import { useAuth } from '../context/AuthContext';

const logo = '/assets/KUTAKSH LOGO.png';

const navItems = [
  { path: '/', label: 'Home' },
  { path: '/platform', label: 'Platform' },
  { path: '/technology', label: 'Technology' },
  { path: '/privacy', label: 'Privacy' },
  { path: '/demo', label: 'Live Demo' },
  { path: '/assistant', label: 'Assistant' },
  { path: '/contact', label: 'Contact' },
];

const roleDashboard = {
  patient: { path: '/dashboard/patient', label: 'My Tracking' },
  caretaker: { path: '/dashboard/caretaker', label: 'Care Dashboard' },
  doctor: { path: '/dashboard/doctor', label: 'Patients' },
};

export default function SiteHeader({ currentPath, onNavigate }) {
  const { user, logout, isAuthenticated } = useAuth();
  const dash = user ? roleDashboard[user.role] : null;

  return (
    <header className="sticky top-4 z-40 mx-auto mb-6 w-full max-w-7xl px-4 md:px-6 lg:px-8 xl:px-10">
      <div className="rounded-[24px] border border-slate-200/70 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(240,253,250,0.94))] px-4 py-3 shadow-[0_12px_40px_rgba(15,23,42,0.07)] backdrop-blur-2xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <button type="button" onClick={() => onNavigate('/')} className="flex items-center gap-3 text-left">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-teal-100 bg-white/90 shadow-sm">
              <img src={logo} alt="Kutaksha logo" className="h-10 w-auto object-contain" />
            </div>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-teal-700">Kutaksha</p>
              <h1 className="text-base font-semibold tracking-tight text-slate-900 md:text-lg">Preventive Healthcare Digital Twin</h1>
            </div>
          </button>

          <nav className="flex flex-wrap items-center gap-2 rounded-full border border-slate-200/80 bg-white/85 p-1.5 shadow-sm">
            {navItems.map((item) => {
              const active = currentPath === item.path;
              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => onNavigate(item.path)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold tracking-wide transition ${
                    active ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}

            {isAuthenticated && dash && (
              <button
                type="button"
                onClick={() => onNavigate(dash.path)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold tracking-wide transition ${
                  currentPath === dash.path ? 'bg-emerald-600 text-white shadow-sm' : 'text-emerald-700 hover:bg-emerald-50'
                }`}
              >
                {dash.label}
              </button>
            )}

            {isAuthenticated ? (
              <div className="ml-1 flex items-center gap-2 border-l border-slate-200 pl-2">
                <span className="hidden text-[10px] font-medium uppercase tracking-[0.24em] text-slate-500 sm:inline">{user.name}</span>
                <button
                  type="button"
                  onClick={() => { logout(); onNavigate('/login'); }}
                  className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                >
                  Logout
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onNavigate('/login')}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold tracking-wide transition ${
                  currentPath === '/login' ? 'bg-teal-600 text-white shadow-sm' : 'text-teal-700 hover:bg-teal-50'
                }`}
              >
                Login
              </button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
