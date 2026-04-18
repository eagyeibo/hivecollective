// ─────────────────────────────────────────────────────────────
// src/context/AuthContext.jsx  — updated for phase 8
// Sets the i18n language automatically when user logs in
// ─────────────────────────────────────────────────────────────
import { createContext, useContext, useState } from 'react';
import i18n from '../i18n';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('hc_user');
    return stored ? JSON.parse(stored) : null;
  });

  const [token, setToken] = useState(() => localStorage.getItem('hc_token') || null);

  function login(userData, jwtToken) {
    setUser(userData);
    setToken(jwtToken);
    localStorage.setItem('hc_user', JSON.stringify(userData));
    localStorage.setItem('hc_token', jwtToken);

    // Set language from user preference
    const lang = userData.preferred_language || 'en';
    i18n.changeLanguage(lang);
    localStorage.setItem('hc_lang', lang);
  }

  function logout() {
    setUser(null);
    setToken(null);
    localStorage.removeItem('hc_user');
    localStorage.removeItem('hc_token');
    // Reset to English on logout
    i18n.changeLanguage('en');
    localStorage.setItem('hc_lang', 'en');
  }

  // Restore language on page refresh
  if (user?.preferred_language) {
    const currentLang = localStorage.getItem('hc_lang');
    if (!currentLang) {
      i18n.changeLanguage(user.preferred_language);
    }
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoggedIn: !!user, setUser, ready: true }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}