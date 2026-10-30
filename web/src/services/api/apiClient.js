import axios from 'axios';
import { ApiEndpoints } from '../../constants/apiEndpoints';

const apiClient = axios.create({
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT Token if logged in
apiClient.interceptors.request.use(
  (config) => {
    config.baseURL = ApiEndpoints.baseUrl;
    const token = localStorage.getItem('reft_auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Don't auto-redirect on public customer verify pages
      if (!window.location.pathname.startsWith('/verify')) {
        localStorage.removeItem('reft_auth_token');
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
