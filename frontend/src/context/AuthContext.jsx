import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { initStorage, login as doLogin, logout as doLogout, getSession } from '../utils/storage';
import { getProfile, loginToBackend, registerToBackend } from '../utils/api';

const AuthContext = createContext(null);

const DEMO_ACCOUNTS = [
  { email: 'patient@kutaksha.com', username: 'patient@kutaksha.com', password: 'patient123', role: 'patient', full_name: 'Rajesh Kumar' },
  { email: 'caretaker@kutaksha.com', username: 'caretaker@kutaksha.com', password: 'caret123', role: 'caregiver', full_name: 'Priya Sharma' },
  { email: 'doctor@kutaksha.com', username: 'doctor@kutaksha.com', password: 'doc123', role: 'doctor', full_name: 'Dr. Ananya Mehta' },
];

function normalizeRole(role) {
  if (role === 'caregiver') return 'caretaker';
  return role;
}

function normalizeUser(payload) {
  if (!payload) return null;
  return {
    id: payload.id,
    email: payload.email,
    role: normalizeRole(payload.role),
    name: payload.full_name || payload.username || payload.email,
    username: payload.username,
    token: payload.token,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initStorage();
    const handleAuthExpired = () => {
      doLogout();
      setUser(null);
    };
    window.addEventListener('kutaksha-auth-expired', handleAuthExpired);

    const bootstrap = async () => {
      const saved = getSession();
      const token = localStorage.getItem('kutaksha_token');

      if (token) {
        try {
          const profile = await getProfile();
          setUser(normalizeUser({ ...profile, token }));
          setLoading(false);
          return;
        } catch {
          localStorage.removeItem('kutaksha_token');
          doLogout();
          setUser(null);
          setLoading(false);
          return;
        }
      }

      if (saved) {
        setUser(saved);
      } else {
        for (const account of DEMO_ACCOUNTS) {
          try {
            await registerToBackend(account);
          } catch {
            // Ignore duplicate or unavailable backend responses.
          }
        }
      }
      setLoading(false);
    };

    bootstrap();
    return () => window.removeEventListener('kutaksha-auth-expired', handleAuthExpired);
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      const tokenResponse = await loginToBackend({ username: email, password });
      localStorage.setItem('kutaksha_token', tokenResponse.access_token);
      const profile = await getProfile();
      const session = normalizeUser({ ...profile, token: tokenResponse.access_token });
      setUser(session);
      return session;
    } catch {
      const fallback = doLogin(email, password);
      if (fallback) {
        setUser(fallback);
      }
      return fallback;
    }
  }, []);

  const logout = useCallback(() => {
    doLogout();
    localStorage.removeItem('kutaksha_token');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
