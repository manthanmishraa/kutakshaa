import { useEffect, useMemo, useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import SiteHeader from './components/SiteHeader';
import SiteFooter from './components/SiteFooter';
import HomePage from './pages/HomePage';
import PlatformPage from './pages/PlatformPage';
import TechnologyPage from './pages/TechnologyPage';
import PrivacyPage from './pages/PrivacyPage';
import DemoPage from './pages/DemoPage';
import ContactPage from './pages/ContactPage';
import AssistantPage from './pages/AssistantPage';
import LoginPage from './pages/LoginPage';
import PatientDashboard from './pages/PatientDashboard';
import CaretakerDashboard from './pages/CaretakerDashboard';
import DoctorDashboard from './pages/DoctorDashboard';

function getPathname() {
  return window.location.pathname || '/';
}

const PROTECTED_ROUTES = {
  '/dashboard/patient': 'patient',
  '/dashboard/caretaker': 'caretaker',
  '/dashboard/doctor': 'doctor',
};

function AppRoutes() {
  const [path, setPath] = useState(getPathname());
  const [assistantOpen, setAssistantOpen] = useState(false);
  const { user, loading } = useAuth();

  useEffect(() => {
    const onPopState = () => setPath(getPathname());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = (nextPath) => {
    if (!nextPath || nextPath === path) return;
    window.history.pushState({}, '', nextPath);
    setPath(nextPath);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const requiredRole = PROTECTED_ROUTES[path];
    if (!requiredRole || loading) return;
    if (!user) return;
    if (user.role !== requiredRole) {
      const routes = { patient: '/dashboard/patient', caretaker: '/dashboard/caretaker', doctor: '/dashboard/doctor' };
      navigate(routes[user.role] || '/login');
    }
  }, [path, user, loading]);

  const page = useMemo(() => {
    const requiredRole = PROTECTED_ROUTES[path];
    if (requiredRole) {
      if (loading) return <div className="flex min-h-[50vh] items-center justify-center text-sm text-slate-500">Loading...</div>;
      if (!user) return <LoginPage onNavigate={navigate} />;
      if (user.role !== requiredRole) return <div className="flex min-h-[50vh] items-center justify-center text-sm text-slate-500">Redirecting...</div>;
    }

    switch (path) {
      case '/':
        return <HomePage onNavigate={navigate} />;
      case '/platform':
        return <PlatformPage onNavigate={navigate} />;
      case '/technology':
        return <TechnologyPage onNavigate={navigate} />;
      case '/privacy':
        return <PrivacyPage onNavigate={navigate} />;
      case '/demo':
        return <DemoPage onNavigate={navigate} />;
      case '/contact':
        return <ContactPage onNavigate={navigate} />;
      case '/assistant':
        return <AssistantPage onNavigate={navigate} />;
      case '/login':
        return <LoginPage onNavigate={navigate} />;
      case '/dashboard/patient':
        return <PatientDashboard />;
      case '/dashboard/caretaker':
        return <CaretakerDashboard />;
      case '/dashboard/doctor':
        return <DoctorDashboard />;
      default:
        return <HomePage onNavigate={navigate} />;
    }
  }, [path, user, loading]);

  return (
    <div className="site-shell min-h-screen pb-2 text-slate-900">
      <SiteHeader currentPath={path} onNavigate={navigate} />
      <main>{page}</main>
      <SiteFooter onNavigate={navigate} />
      {user && path !== '/assistant' && assistantOpen && (
        <aside className="fixed inset-y-4 right-4 z-50 flex w-[calc(100vw-2rem)] max-w-md flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-slate-50 shadow-[0_24px_80px_rgba(15,23,42,0.24)]">
          <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-teal-700">Kutaksha Assistant</p>
              <p className="text-sm font-semibold text-slate-900">Medical records and behavior</p>
            </div>
            <button
              type="button"
              onClick={() => setAssistantOpen(false)}
              aria-label="Close medical records assistant"
              title="Close assistant"
              className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-300"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto py-4">
            <AssistantPage onNavigate={navigate} />
          </div>
        </aside>
      )}
      {user && path !== '/assistant' && (
        <button
          type="button"
          onClick={() => setAssistantOpen((open) => !open)}
          aria-label={assistantOpen ? 'Close medical records assistant' : 'Open medical records assistant'}
          title={assistantOpen ? 'Close assistant' : 'Open medical records assistant'}
          className="fixed bottom-5 right-5 z-[51] flex h-14 w-14 items-center justify-center rounded-full border border-teal-200 bg-slate-900 text-teal-200 shadow-[0_12px_30px_rgba(15,23,42,0.24)] transition hover:-translate-y-1 hover:bg-teal-700 hover:text-white focus:outline-none focus:ring-4 focus:ring-teal-300/50"
        >
          {assistantOpen ? <X size={23} strokeWidth={1.8} aria-hidden="true" /> : <MessageCircle size={23} strokeWidth={1.8} aria-hidden="true" />}
        </button>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
