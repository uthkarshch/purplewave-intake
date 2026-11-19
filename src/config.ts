import Constants from 'expo-constants';

const PORT = 4000;

// Phones reach the dev machine over the LAN; Expo already knows that host.
export function getApiBaseUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) return process.env.EXPO_PUBLIC_API_URL;
  const host = Constants.expoConfig?.hostUri?.split(':')[0] ?? 'localhost';
  return `http://${host}:${PORT}`;
}
