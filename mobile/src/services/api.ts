import axios from 'axios';
import { Platform, TurboModuleRegistry } from 'react-native';

function getDevBaseUrl(): string {
  if (Platform.OS === 'android') return 'http://10.0.2.2:3000';
  try {
    const SourceCode = TurboModuleRegistry.get<{ getConstants(): { scriptURL?: string } }>('SourceCode');
    const scriptURL = SourceCode?.getConstants()?.scriptURL;
    const match = scriptURL?.match(/^https?:\/\/([^:/]+)/);
    if (match) return `http://${match[1]}:3000`;
  } catch {}
  return 'http://localhost:3000';
}

export const BASE_URL = __DEV__ ? getDevBaseUrl() : 'https://api.mynorth.app';

const api = axios.create({ baseURL: BASE_URL });

export function setAuthToken(token: string | null) {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
}

export default api;
