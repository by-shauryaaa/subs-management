import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from './ui/button';

const ThemeContext = createContext({ dark: false, toggle: () => {} });
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<boolean | null>(() => {
    try {
      const saved = localStorage.getItem('brightloop-theme');
      return saved === 'dark' ? true : saved === 'light' ? false : true;
    } catch {
      return null;
    }
  });
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false,
  );
  const dark = preference ?? systemDark;
  useEffect(() => {
    const query = window.matchMedia?.('(prefers-color-scheme: dark)');
    const listener = (event: MediaQueryListEvent) =>
      setSystemDark(event.matches);
    query?.addEventListener('change', listener);
    return () => query?.removeEventListener('change', listener);
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);
  function toggle() {
    setPreference(!dark);
    try {
      localStorage.setItem('brightloop-theme', dark ? 'light' : 'dark');
    } catch {
      /* Theme still works when browser storage is unavailable. */
    }
  }
  return (
    <ThemeContext.Provider value={{ dark, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}
export function ThemeToggle() {
  const { dark, toggle } = useContext(ThemeContext);
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={dark ? 'Use light theme' : 'Use dark theme'}
    >
      {dark ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </Button>
  );
}
