export type Tone = 'ok' | 'warn' | 'retry' | 'info' | 'danger';

// fg is the text colour, bar the saturated accent from the design (left edge bars, dots, progress).
export const TONES: Record<Tone, { fg: string; bg: string; border: string; bar: string }> = {
  ok: { fg: '#15803D', bg: '#DCFCE7', border: '#BBF7D0', bar: '#16A34A' },
  warn: { fg: '#B45309', bg: '#FEF3C7', border: '#FDE68A', bar: '#D97706' },
  retry: { fg: '#C2410C', bg: '#FFEDD5', border: '#FED7AA', bar: '#EA580C' },
  info: { fg: '#1D4ED8', bg: '#DBEAFE', border: '#BFDBFE', bar: '#2563EB' },
  danger: { fg: '#B91C1C', bg: '#FEE2E2', border: '#FECACA', bar: '#DC2626' },
};
