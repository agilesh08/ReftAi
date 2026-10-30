import apiClient from './apiClient';
import { ApiEndpoints } from '../../constants/apiEndpoints';

export const authService = {
  async login(email, password) {
    const cleanEmail = (email || '').trim();
    if (!cleanEmail || !password) {
      throw new Error('Please enter both email and password');
    }

    const response = await apiClient.post(ApiEndpoints.login, {
      email: cleanEmail,
      password: password,
    });

    const data = response.data;
    if (data.access_token) {
      localStorage.setItem('reft_auth_token', data.access_token);

      // Fetch authentic merchant profile from /api/v1/auth/me
      try {
        const meResponse = await apiClient.get(`${ApiEndpoints.baseUrl}/api/v1/auth/me`, {
          headers: { Authorization: `Bearer ${data.access_token}` },
        });
        const merchant = meResponse.data;
        localStorage.setItem('reft_user', JSON.stringify(merchant));
        return { success: true, user: merchant, token: data.access_token };
      } catch (err) {
        const fallbackUser = {
          id: 'merchant-id',
          email: cleanEmail,
          business_name: 'Merchant Store',
        };
        localStorage.setItem('reft_user', JSON.stringify(fallbackUser));
        return { success: true, user: fallbackUser, token: data.access_token };
      }
    }

    throw new Error('Authentication failed: No access token received');
  },

  async register(businessName, email, password, phone = null) {
    const response = await apiClient.post(`${ApiEndpoints.baseUrl}/api/v1/auth/register`, {
      business_name: businessName,
      email: email.trim(),
      password: password,
      phone: phone || null,
    });
    return response.data;
  },

  async getMe() {
    const response = await apiClient.get(`${ApiEndpoints.baseUrl}/api/v1/auth/me`);
    const user = response.data;
    localStorage.setItem('reft_user', JSON.stringify(user));
    return user;
  },

  logout() {
    localStorage.removeItem('reft_auth_token');
    localStorage.removeItem('reft_user');
  },

  getCurrentUser() {
    const raw = localStorage.getItem('reft_user');
    return raw ? JSON.parse(raw) : null;
  },

  isAuthenticated() {
    return Boolean(localStorage.getItem('reft_auth_token'));
  },
};
