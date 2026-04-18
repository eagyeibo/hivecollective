import { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => {
    const stored = localStorage.getItem('hc_dark') !== 'false';
    if (!stored) document.documentElement.classList.add('light-theme');
    return stored;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.remove('light-theme');
    } else {
      root.classList.add('light-theme');
    }
    localStorage.setItem('hc_dark', dark ? 'true' : 'false');
  }, [dark]);

  return (
    <ThemeContext.Provider value={{ dark, toggle: () => setDark(d => !d) }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
