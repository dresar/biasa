
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle 401
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('auth_token');
      // Optionally redirect to login
      // window.location.href = '/auth';
    }
    return Promise.reject(error);
  }
);

export const api = {
  auth: {
    signIn: (data: any) => apiClient.post('/auth/login', data),
    me: () => apiClient.get('/auth/me'),
    updatePassword: (data: any) => apiClient.put('/auth/password', data),
    signOut: () => {
      localStorage.removeItem('auth_token');
      return Promise.resolve();
    }
  },
  profiles: {
    get: () => apiClient.get('/profiles'),
    update: (data: any) => apiClient.patch('/profiles', data),
  },
  storageCredentials: {
    list: () => apiClient.get('/storage_credentials'),
    create: (data: any) => apiClient.post('/storage_credentials', data),
    update: (id: string, data: any) => apiClient.patch(`/storage_credentials/${id}`, data),
    delete: (id: string) => apiClient.delete(`/storage_credentials/${id}`),
  },
  files: {
    list: () => apiClient.get('/files'),
    create: (data: any) => apiClient.post('/files', data),
    delete: (id: string) => apiClient.delete(`/files/${id}`),
  },
  categories: {
    list: () => apiClient.get('/categories'),
    create: (data: any) => apiClient.post('/categories', data),
    update: (id: string, data: any) => apiClient.patch(`/categories/${id}`, data),
    delete: (id: string) => apiClient.delete(`/categories/${id}`),
  },
  activityLogs: {
    list: () => apiClient.get('/activity_logs'),
    create: (data: any) => apiClient.post('/activity_logs', data),
  },
  functions: {
    invoke: (name: string, options: any) => {
      if (name === 'imagekit-upload') {
        return apiClient.post('/functions/imagekit-upload', options.body);
      }
      if (name === 'imagekit-delete') {
        return apiClient.post('/functions/imagekit-delete', options.body);
      }
      if (name === 'cloudinary-sign') {
        return apiClient.post('/functions/cloudinary-sign', options.body);
      }
      if (name === 'cloudinary-delete') {
        return apiClient.post('/functions/cloudinary-delete', options.body);
      }
      return Promise.reject(new Error(`Function ${name} not implemented`));
    }
  }
};
