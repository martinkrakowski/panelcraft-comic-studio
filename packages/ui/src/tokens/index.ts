/**
 * Authoritative UI Design Tokens for PanelCraft Comic Studio.
 * These map to CSS variables and baseline theme parameters.
 */

export const colorTokens = {
  background: "hsl(224 71% 4%)",
  foreground: "hsl(213 31% 91%)",
  border: "hsl(223 47% 11%)",
  card: "hsl(224 71% 4%)",
  indigo: {
    500: "rgb(99 102 241)",
    600: "rgb(79 70 229)",
  },
  slate: {
    400: "rgb(148 163 184)",
    800: "rgb(30 41 59)",
    900: "rgb(15 23 42)",
  }
} as const;

export const motionTokens = {
  transitionDefault: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  transitionFast: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
} as const;
