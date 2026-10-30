import apiClient from './apiClient';
import { ApiEndpoints } from '../../constants/apiEndpoints';

export const evidenceService = {
  // Merchant Methods
  async listMerchantEvidence(verificationId, workflowStepKey = null) {
    const url = `${ApiEndpoints.baseUrl}/api/v1/verifications/${verificationId}/evidence`;
    const params = workflowStepKey ? { workflow_step_key: workflowStepKey } : {};
    const response = await apiClient.get(url, { params });
    return response.data;
  },

  getMerchantEvidenceFileUrl(verificationId, evidenceId) {
    return `${ApiEndpoints.baseUrl}/api/v1/verifications/${verificationId}/evidence/${evidenceId}`;
  },

  // Customer Methods (Public - token based)
  async uploadCustomerImage(token, file, workflowStepKey = null) {
    const formData = new FormData();
    formData.append('file', file);
    if (workflowStepKey) {
      formData.append('workflow_step_key', workflowStepKey);
    }

    const response = await apiClient.post(
      ApiEndpoints.customerEvidenceImage(token),
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    );
    return response.data;
  },

  async submitCustomerText(token, text, workflowStepKey = null) {
    const response = await apiClient.post(ApiEndpoints.customerEvidenceText(token), {
      workflow_step_key: workflowStepKey,
      text: text,
    });
    return response.data;
  },

  async listCustomerEvidence(token, workflowStepKey = null) {
    const params = workflowStepKey ? { workflow_step_key: workflowStepKey } : {};
    const response = await apiClient.get(ApiEndpoints.customerEvidenceList(token), { params });
    return response.data;
  },

  getCustomerEvidenceFileUrl(token, evidenceId) {
    return ApiEndpoints.customerEvidenceFile(token, evidenceId);
  },
};
