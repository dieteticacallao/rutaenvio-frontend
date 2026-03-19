import axios from 'axios';
import { create } from 'zustand';

// === API Client ===
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// === Auth Store ===
export const useAuth = create((set) => ({
  user: null,
  business: null,
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.token);
    set({ user: data.user, business: data.business, token: data.token, isAuthenticated: true });
    return data;
  },

  register: async (formData) => {
    const { data } = await api.post('/auth/register', formData);
    localStorage.setItem('token', data.token);
    set({ user: data.user, business: data.business, token: data.token, isAuthenticated: true });
    return data;
  },

  loadUser: async () => {
    try {
      const { data } = await api.get('/auth/me');
      set({ user: data.user, business: data.business, isAuthenticated: true });
    } catch {
      set({ user: null, business: null, isAuthenticated: false });
      localStorage.removeItem('token');
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ user: null, business: null, token: null, isAuthenticated: false });
  }
}));

// === Status helpers ===
export const STATUS_MAP = {
  PENDING: { label: 'Pendiente', color: 'badge-pending' },
  ASSIGNED: { label: 'Asignado', color: 'badge-transit' },
  PICKED_UP: { label: 'Retirado', color: 'badge-transit' },
  IN_TRANSIT: { label: 'En camino', color: 'badge-transit' },
  ARRIVED: { label: 'Llegó', color: 'badge-transit' },
  DELIVERED: { label: 'Entregado', color: 'badge-delivered' },
  FAILED: { label: 'Fallido', color: 'badge-cancelled' },
  CANCELLED: { label: 'Cancelado', color: 'badge-cancelled' },
  RETURNED: { label: 'Devuelto', color: 'badge-cancelled' }
};

export const ROUTE_COLORS = [
  '#0ea5e9', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#14b8a6', '#6366f1'
];
