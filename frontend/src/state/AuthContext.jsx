import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { endpoints, setUnauthorizedHandler } from '../api/client.js';
import { useToast } from './ToastContext.jsx';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const toast = useToast();
  const [state, setState] = useState({ status: 'checking', user: null });
  const [signup, setSignup] = useState(false);

  useEffect(() => {
    let alive = true;
    endpoints.me()
      .then((r) => {
        if (!alive) return;
        setSignup(Boolean(r.signup));
        setState({ status: r.user ? 'authed' : 'anon', user: r.user });
      })
      .catch(() => alive && setState({ status: 'anon', user: null }));
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      setState((s) => {
        if (s.status === 'authed') toast('Sessiya tugadi. Qaytadan kiring.', true);
        return { status: 'anon', user: null };
      });
    });
    return () => setUnauthorizedHandler(null);
  }, [toast]);

  const login = useCallback(async (username, password) => {
    const r = await endpoints.login(username, password);
    setState({ status: 'authed', user: r.user });
  }, []);

  const register = useCallback(async (fields) => {
    const r = await endpoints.register(fields);
    setState({ status: 'authed', user: r.user });
  }, []);

  const resetPassword = useCallback(async (fields) => {
    const r = await endpoints.resetPassword(fields);
    setState({ status: 'authed', user: r.user });
  }, []);

  const updateProfile = useCallback(async (fields) => {
    const r = await endpoints.updateProfile(fields);
    setState((s) => ({ ...s, user: r.user }));
  }, []);

  const logout = useCallback(async () => {
    try { await endpoints.logout(); } finally { setState({ status: 'anon', user: null }); }
  }, []);

  const value = useMemo(
    () => ({ ...state, signup, login, register, resetPassword, updateProfile, logout }),
    [state, signup, login, register, resetPassword, updateProfile, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
