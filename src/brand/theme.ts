/**
 * Brand → CSS variables, matching prototype v10 (app.js applyTheme / darkShades).
 * Brand primaries are usually dark, so Night Mode derives a light "ink" shade
 * (links, active tabs, icons) and a mid-tone "fill" shade (buttons, chips).
 */
import type { Brand } from './schema';

type Hsl = [h: number, s: number, l: number];

export function hexToHsl(hex: string): Hsl {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255,
    g = ((n >> 8) & 255) / 255,
    b = (n & 255) / 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    l = (max + min) / 2,
    d = max - min;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, s, l];
}

export function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s,
    x = c * (1 - Math.abs(((h / 60) % 2) - 1)),
    m = l - c / 2;
  const [r, g, b] =
    h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return (
    '#' +
    [r, g, b]
      .map(v => Math.round((v + m) * 255).toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  );
}

export function darkShades(hex: string) {
  const [h, s, l] = hexToHsl(hex),
    sat = Math.min(0.72, Math.max(s, 0.38));
  return { ink: hslToHex(h, sat, Math.max(l, 0.74)), fill: hslToHex(h, sat, Math.min(0.44, Math.max(l, 0.36))) };
}

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const L = (c: number) => {
    c /= 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * L((n >> 16) & 255) + 0.7152 * L((n >> 8) & 255) + 0.0722 * L(n & 255);
}

/** WCAG contrast ratio between two colours (1–21). */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Readable text on a colour: whichever of near-black and white contrasts more. */
export function contrast(hex: string): '#1A1A1A' | '#FFFFFF' {
  return contrastRatio(hex, '#FFFFFF') >= contrastRatio(hex, '#1A1A1A') ? '#FFFFFF' : '#1A1A1A';
}

/**
 * The Sot headline card always carries white text. Light brand primaries are darkened
 * (same hue) until white reads at 4.5:1 or better; dark primaries are used as they are.
 */
export function heroBase(hex: string): string {
  if (contrastRatio(hex, '#FFFFFF') >= 4.5) return hex.toUpperCase();
  const [h, s, l] = hexToHsl(hex);
  for (let x = l; x > 0; x -= 0.01) {
    const c = hslToHex(h, s, x);
    if (contrastRatio(c, '#FFFFFF') >= 4.5) return c;
  }
  return '#1A1A1A';
}

/** The brand layer of tokens.css; everything semantic derives from these. */
export function brandCssVars(colors: Brand['colors']): Record<string, string> {
  const ds = darkShades(colors.primary);
  return {
    '--brand-primary': colors.primary,
    '--brand-primary-contrast': contrast(colors.primary),
    '--brand-hero': heroBase(colors.primary),
    '--brand-accent': colors.accent,
    '--brand-accent-contrast': contrast(colors.accent),
    '--brand-background': colors.background,
    '--brand-text': colors.text,
    '--brand-ink-dark': ds.ink,
    '--brand-fill-dark': ds.fill,
    '--brand-fill-dark-contrast': contrast(ds.fill),
  };
}

export const cssVarsToString = (vars: Record<string, string>) =>
  Object.entries(vars)
    .map(([k, v]) => `${k}:${v}`)
    .join(';');
