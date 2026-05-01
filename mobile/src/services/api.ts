import axios from 'axios';
import { Platform } from 'react-native';
import { DEV_HOST } from '../devConfig';

function getDevBaseUrl(): string {
  if (Platform.OS === 'android') return 'http://10.0.2.2:3000';
  return `http://${DEV_HOST}:3000`;
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
