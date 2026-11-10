export type ThemeColors = {
  ink: string;
  muted: string;
  paper: string;
  card: string;
  mint: string;
  mintText: string;
  mintStrong: string;
  coral: string;
  coralMuted: string;
  line: string;
  white: string;
  danger: string;
  dangerBg: string;
  inputBg: string;
};

export const lightColors: ThemeColors = {
  ink: '#1D2A27',
  muted: '#75817D',
  paper: '#F7F8F4',
  card: '#FFFFFF',
  mint: '#DCEFE4',
  mintText: '#557362',
  mintStrong: '#AFD9C1',
  coral: '#E98163',
  coralMuted: '#FDEAE6',
  line: '#E1E8E2',
  white: '#FFFFFF',
  danger: '#C95B4E',
  dangerBg: '#FFF8F6',
  inputBg: '#F7F8F4',
};

export const darkColors: ThemeColors = {
  ink: '#EEF3F0',
  muted: '#9CA9A2',
  paper: '#121715',
  card: '#1B221F',
  mint: '#1F3429',
  mintText: '#87C8A4',
  mintStrong: '#2A4E3B',
  coral: '#FF7A59',
  coralMuted: '#3D2520',
  line: '#28332E',
  white: '#1B221F',
  danger: '#F27161',
  dangerBg: '#351F1C',
  inputBg: '#161D1A',
};

// Default export for backward compatibility
export const colors = lightColors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
};

export const typography = {
  body: 14,
  caption: 11,
  label: 10,
  title: 43,
  section: 23,
};

export const shadows = {
  card: {
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
};
