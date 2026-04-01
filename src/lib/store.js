import axios from 'axios';
import { create } from 'zustand';

// === API Client ===
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://rutaenvio-backend-production.up.railway.app/api',
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
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// === Helpers ===
const savedUser = () => {
  try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
};

const ROLE_LABELS = {
  SUPER_ADMIN: 'Super Admin',
  LOGISTICS_ADMIN: 'Admin Logistica',
  STORE_ADMIN: 'Admin Tienda',
};

export const getRoleLabel = (role) => ROLE_LABELS[role] || role;

// === Auth Store ===
export const useAuth = create((set) => ({
  user: savedUser(),
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),

  login: async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token, user } = res.data.data;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ user, token, isAuthenticated: true });
    return { token, user };
  },

  loadUser: async () => {
    try {
      const res = await api.get('/auth/me');
      const { user } = res.data.data;
      localStorage.setItem('user', JSON.stringify(user));
      set({ user, isAuthenticated: true });
    } catch {
      set({ user: null, isAuthenticated: false });
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    set({ user: null, token: null, isAuthenticated: false });
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
