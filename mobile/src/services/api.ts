import axios from 'axios';
import { NativeModules, Platform } from 'react-native';

function getDevBaseUrl(): string {
  if (Platform.OS === 'android') return 'http://10.0.2.2:3000';
  // Derive host from Metro bundler URL — works for both simulator and physical device
  const scriptURL: string | undefined = NativeModules.SourceCode?.scriptURL;
  const match = scriptURL?.match(/^https?:\/\/([^:/]+)/);
  const host = match ? match[1] : 'localhost';
  return `http://${host}:3000`;
}

const BASE_URL = __DEV__ ? getDevBaseUrl() : 'https://api.mynorth.app';

const api = axios.create({ baseURL: BASE_URL });

export function setAuthToken(token: string | null) {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
}

export default api;
