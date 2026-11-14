export type ThemeMode = "light" | "dark";

// "onColor" é sempre branco puro, independente do tema — usado em texto/ícones
// desenhados diretamente sobre um fundo de cor saturada (botões, chips
// selecionados, círculos de estado), que precisam de ficar legíveis em
// ambos os modos. As restantes chaves representam superfícies/texto neutro
// e invertem no modo escuro.
export const lightColors = {
  violet50: "#f5f3ff",
  violet100: "#ede9fe",
  violet200: "#ddd6fe",
  violet500: "#8b5cf6",
  violet600: "#7c3aed",
  violet700: "#6d28d9",
  violet900: "#4c1d95",
  stone50: "#fafaf9",
  stone100: "#f5f5f4",
  stone200: "#e7e5e4",
  stone400: "#a8a29e",
  stone500: "#78716c",
  stone600: "#57534e",
  stone800: "#292524",
  stone900: "#1c1917",
  white: "#ffffff",
  onColor: "#ffffff",
  red500: "#ef4444",
  red600: "#dc2626",
  green600: "#16a34a",
  amber500: "#f59e0b",
};

export const darkColors = {
  violet50: "#2a1f45",
  violet100: "#3c2a63",
  violet200: "#4b3480",
  violet500: "#a78bfa",
  violet600: "#8b5cf6",
  violet700: "#c4b5fd",
  violet900: "#ede9fe",
  stone50: "#121113",
  stone100: "#1c1b1e",
  stone200: "#3a373e",
  stone400: "#716d78",
  stone500: "#9a95a3",
  stone600: "#b7b2bd",
  stone800: "#d8d4de",
  stone900: "#f5f3f7",
  white: "#1e1b23",
  onColor: "#ffffff",
  red500: "#f87171",
  red600: "#f87171",
  green600: "#4ade80",
  amber500: "#fbbf24",
};

export type ThemeColors = typeof lightColors;

// Alias estático para ecrãs que ficam deliberadamente fora do tema (ex.:
// login, splash — sempre com a identidade de marca roxa, em qualquer modo).
export const colors = lightColors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 999,
};
