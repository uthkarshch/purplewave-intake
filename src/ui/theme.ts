// Daylight palette from the Stitch "Purple Wave Intake" design. Text tones are one step darker than the
// design's bar colours so small status text keeps AA contrast on its tinted background.
export const colors = {
  ground: '#F8F9FF',
  surface: '#FFFFFF',
  ink: '#0F172A',
  muted: '#475569',
  line: '#E2E8F0',
  track: '#F1F5F9',
  fieldBg: '#F8FAFC',
  fieldLine: '#CBD5E1',
  placeholder: '#94A3B8',
  accent: '#0369A1',
  onAccent: '#FFFFFF',
  accentSoft: '#E0F2FE',
  accentBorder: '#BAE6FD',
  required: '#DC2626',
};

export const radius = { sm: 8, md: 12, pill: 999 };

export const type = {
  body: 16,
  label: 14,
  small: 13,
  micro: 11,
  title: 18,
};

// regular is Public Sans 500, medium and bold are Space Grotesk; names kept so call sites stay stable.
export const font = {
  regular: 'PublicSans_500Medium',
  strong: 'PublicSans_600SemiBold',
  medium: 'SpaceGrotesk_600SemiBold',
  bold: 'SpaceGrotesk_700Bold',
};
