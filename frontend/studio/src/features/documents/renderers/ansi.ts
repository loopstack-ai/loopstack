import type { CSSProperties } from 'react';

/**
 * Minimal ANSI SGR (Select Graphic Rendition) parser: turns a raw terminal stream into styled tokens so
 * a React component can render colored `<span>`s. Handles the escape sequences NestJS / npm / tsx / git
 * actually emit — the 16 base colors, bright variants, the xterm 256-color cube, truecolor, and the
 * bold / dim / italic / underline attributes. Unknown sequences are ignored (their text still renders).
 */

export interface AnsiToken {
  text: string;
  style: CSSProperties;
}

// A dark-terminal palette (VS Code "Dark+"), indices 0–15 (normal 0–7, bright 8–15).
const PALETTE_16 = [
  '#000000',
  '#cd3131',
  '#0dbc79',
  '#e5e510',
  '#2472c8',
  '#bc3fbc',
  '#11a8cd',
  '#e5e5e5',
  '#666666',
  '#f14c4c',
  '#23d18b',
  '#f5f543',
  '#3b8eea',
  '#d670d6',
  '#29b8db',
  '#ffffff',
];

const CUBE_STEPS = [0, 95, 135, 175, 215, 255];

function xterm256ToHex(n: number): string {
  if (n < 16) return PALETTE_16[n];
  if (n <= 231) {
    const i = n - 16;
    const r = CUBE_STEPS[Math.floor(i / 36) % 6];
    const g = CUBE_STEPS[Math.floor(i / 6) % 6];
    const b = CUBE_STEPS[i % 6];
    return `rgb(${r}, ${g}, ${b})`;
  }
  const c = 8 + (n - 232) * 10;
  return `rgb(${c}, ${c}, ${c})`;
}

interface SgrState {
  fg?: string;
  bg?: string;
  bold?: boolean;
  dim?: boolean;
  italic?: boolean;
  underline?: boolean;
}

function apply(state: SgrState, params: number[]): void {
  for (let i = 0; i < params.length; i++) {
    const p = params[i];
    if (p === 0) {
      state.fg = state.bg = undefined;
      state.bold = state.dim = state.italic = state.underline = false;
    } else if (p === 1) state.bold = true;
    else if (p === 2) state.dim = true;
    else if (p === 3) state.italic = true;
    else if (p === 4) state.underline = true;
    else if (p === 22) state.bold = state.dim = false;
    else if (p === 23) state.italic = false;
    else if (p === 24) state.underline = false;
    else if (p >= 30 && p <= 37) state.fg = PALETTE_16[p - 30];
    else if (p >= 90 && p <= 97) state.fg = PALETTE_16[p - 90 + 8];
    else if (p === 39) state.fg = undefined;
    else if (p >= 40 && p <= 47) state.bg = PALETTE_16[p - 40];
    else if (p >= 100 && p <= 107) state.bg = PALETTE_16[p - 100 + 8];
    else if (p === 49) state.bg = undefined;
    else if (p === 38 || p === 48) {
      const target = p === 38 ? 'fg' : 'bg';
      if (params[i + 1] === 5) {
        state[target] = xterm256ToHex(params[i + 2]);
        i += 2;
      } else if (params[i + 1] === 2) {
        state[target] = `rgb(${params[i + 2]}, ${params[i + 3]}, ${params[i + 4]})`;
        i += 4;
      }
    }
  }
}

function toStyle(state: SgrState): CSSProperties {
  const style: CSSProperties = {};
  // Bold + a base color reads as the bright variant on real terminals.
  let fg = state.fg;
  if (state.bold && fg) {
    const idx = PALETTE_16.indexOf(fg);
    if (idx >= 0 && idx < 8) fg = PALETTE_16[idx + 8];
  }
  if (fg) style.color = fg;
  if (state.bg) style.backgroundColor = state.bg;
  if (state.bold) style.fontWeight = 700;
  if (state.dim) style.opacity = 0.6;
  if (state.italic) style.fontStyle = 'italic';
  if (state.underline) style.textDecoration = 'underline';
  return style;
}

// Matching the ESC control byte (0x1b) is the whole point of an ANSI parser.
// eslint-disable-next-line no-control-regex
const SGR = /\x1b\[([0-9;]*)m/g;

export function parseAnsi(input: string): AnsiToken[] {
  const tokens: AnsiToken[] = [];
  const state: SgrState = {};
  let last = 0;
  let match: RegExpExecArray | null;

  const push = (text: string): void => {
    if (text) tokens.push({ text, style: toStyle(state) });
  };

  SGR.lastIndex = 0;
  while ((match = SGR.exec(input)) !== null) {
    push(input.slice(last, match.index));
    const params = match[1] === '' ? [0] : match[1].split(';').map((n) => Number(n) || 0);
    apply(state, params);
    last = SGR.lastIndex;
  }
  push(input.slice(last));
  return tokens;
}
