import { createContext, useContext, useState, useCallback } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => {
    const stored = localStorage.getItem('ai-avventura-auth');
    if (stored) {
      try { return JSON.parse(stored); } catch { return null; }
    }
    return null;
  });

  const login = useCallback((data) => {
    setAuth(data);
    localStorage.setItem('ai-avventura-auth', JSON.stringify(data));
  }, []);

  const logout = useCallback(() => {
    setAuth(null);
    localStorage.removeItem('ai-avventura-auth');
  }, []);

  return (
    <AuthContext.Provider value={{ auth, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
