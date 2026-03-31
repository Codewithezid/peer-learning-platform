import axios from 'axios';
import { supabase } from './supabase';
import { isGuestSessionActive } from './guestSession';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  if (isGuestSessionActive()) {
    return config;
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
  } catch {
    // If Supabase is unreachable, continue as unauthenticated request.
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      if (isGuestSessionActive()) {
        return Promise.reject(error);
      }

      try {
        const { error: refreshError } = await supabase.auth.refreshSession();
        if (refreshError && typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      } catch {
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
