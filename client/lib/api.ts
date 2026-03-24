import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3001';

const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use(config => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export interface LoginResult {
  token: string;
  user: { id: string; username: string; displayName: string; isGuest?: boolean };
}

export async function register(username: string, password: string, displayName: string): Promise<LoginResult> {
  const { data } = await api.post('/auth/register', { username, password, displayName });
  return data;
}

export async function login(username: string, password: string): Promise<LoginResult> {
  const { data } = await api.post('/auth/login', { username, password });
  return data;
}

export async function loginAsGuest(displayName?: string): Promise<LoginResult> {
  const { data } = await api.post('/auth/guest', { displayName });
  return data;
}

export async function getMe() {
  const { data } = await api.get('/auth/me');
  return data;
}

export async function updateProfile(displayName: string) {
  const { data } = await api.patch('/auth/profile', { displayName });
  return data;
}

export default api;
