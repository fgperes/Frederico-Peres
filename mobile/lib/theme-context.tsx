import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { darkColors, lightColors, type ThemeColors, type ThemeMode } from "./theme";

const STORAGE_KEY = "p4p-theme";

type ThemeState = {
  mode: ThemeMode;
  colors: ThemeColors;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeState | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>("light");

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((stored) => {
      if (stored === "dark" || stored === "light") setMode(stored);
    });
  }, []);

  const toggleTheme = () => {
    setMode((curr) => {
      const next: ThemeMode = curr === "light" ? "dark" : "light";
      AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
      return next;
    });
  };

  const value = useMemo<ThemeState>(
    () => ({ mode, colors: mode === "dark" ? darkColors : lightColors, toggleTheme }),
    [mode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

function useThemeState(): ThemeState {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useThemeColors/useThemeMode devem ser usados dentro de um ThemeProvider.");
  return ctx;
}

export function useThemeColors(): ThemeColors {
  return useThemeState().colors;
}

export function useThemeMode(): ThemeMode {
  return useThemeState().mode;
}

export function useToggleTheme(): () => void {
  return useThemeState().toggleTheme;
}
