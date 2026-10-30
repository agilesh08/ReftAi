import apiClient from './apiClient';
import { ApiEndpoints } from '../../constants/apiEndpoints';

export const followUpService = {
  // Merchant
  async listMerchantRequests(verificationId) {
    const url = `${ApiEndpoints.baseUrl}/api/v1/verifications/${verificationId}/evidence-requests`;
    const response = await apiClient.get(url);
    return response.data;
  },

  // Customer
  async listCustomerRequests(token) {
    const response = await apiClient.get(ApiEndpoints.customerEvidenceRequests(token));
    return response.data;
  },

  async fulfillCustomerRequest(token, requestId, { file = null, textContent = null, selectedOption = null } = {}) {
    const formData = new FormData();
    if (file) formData.append('file', file);
    if (textContent) formData.append('text_content', textContent);
    if (selectedOption) formData.append('selected_option', selectedOption);

    const response = await apiClient.post(
      ApiEndpoints.customerFulfillRequest(token, requestId),
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  },
};
