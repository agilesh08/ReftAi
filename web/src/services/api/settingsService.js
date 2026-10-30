import apiClient from './apiClient';
import { ApiEndpoints } from '../../constants/apiEndpoints';

export const settingsService = {
  async getProfile() {
    const response = await apiClient.get(`${ApiEndpoints.baseUrl}/api/v1/merchants/profile`);
    return response.data;
  },

  async updateProfile(profileData) {
    const response = await apiClient.put(`${ApiEndpoints.baseUrl}/api/v1/merchants/profile`, {
      business_name: profileData.businessName || profileData.business_name,
      phone: profileData.phone || null,
    });
    return response.data;
  },

  async changePassword(currentPassword, newPassword) {
    const response = await apiClient.post(`${ApiEndpoints.baseUrl}/api/v1/auth/change-password`, {
      current_password: currentPassword,
      new_password: newPassword,
    });
    return response.data;
  },

  async checkHealth() {
    const response = await apiClient.get(`${ApiEndpoints.baseUrl}/health`);
    return response.data;
  },
};
