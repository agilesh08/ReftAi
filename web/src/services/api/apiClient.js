import axios from 'axios';
import { ApiEndpoints } from '../../constants/apiEndpoints';

const apiClient = axios.create({
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

let isRenewing = false;
let pendingRequests = [];

const processPendingRequests = (token, error = null) => {
  pendingRequests.forEach((cb) => cb(token, error));
  pendingRequests = [];
};

async function getOrRenewToken() {
  let token = localStorage.getItem('reft_auth_token');
  if (token) return token;

  if (isRenewing) {
    return new Promise((resolve, reject) => {
      pendingRequests.push((newToken, err) => {
        if (err) reject(err);
        else resolve(newToken);
      });
    });
  }

  isRenewing = true;
  try {
    const res = await axios.post(`${ApiEndpoints.baseUrl}/api/v1/auth/login`, {
      email: 'merchant@example.com',
      password: 'password123',
    });
    if (res.data?.access_token) {
      const newToken = res.data.access_token;
      localStorage.setItem('reft_auth_token', newToken);
      processPendingRequests(newToken);
      return newToken;
    }
  } catch (err) {
    processPendingRequests(null, err);
  } finally {
    isRenewing = false;
  }
  return null;
}

// Request interceptor to attach JWT Token
apiClient.interceptors.request.use(
  async (config) => {
    config.baseURL = ApiEndpoints.baseUrl;
    const url = config.url || '';
    if (!url.includes('/auth/login') && !url.includes('/auth/register') && !url.includes('/public/')) {
      let token = localStorage.getItem('reft_auth_token');
      if (!token) {
        token = await getOrRenewToken();
      }
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: auto-retry once with renewed token on 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/auth/login')
    ) {
      originalRequest._retry = true;
      localStorage.removeItem('reft_auth_token');
      const newToken = await getOrRenewToken();
      if (newToken) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      }
    }
    return Promise.reject(error);
  }
);

export { apiClient };
export default apiClient;

