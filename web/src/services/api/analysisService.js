import apiClient from './apiClient';
import { ApiEndpoints } from '../../constants/apiEndpoints';

export const analysisService = {
  async analyzeEvidence(verificationId, evidenceId, forceReanalyze = false) {
    const url = `${ApiEndpoints.baseUrl}/api/v1/verifications/${verificationId}/evidence/${evidenceId}/analyze?force_reanalyze=${forceReanalyze}`;
    const response = await apiClient.post(url);
    return response.data;
  },

  async getEvidenceAnalysis(verificationId, evidenceId) {
    const url = `${ApiEndpoints.baseUrl}/api/v1/verifications/${verificationId}/evidence/${evidenceId}/analysis`;
    const response = await apiClient.get(url);
    return response.data;
  },

  async runReasoning(verificationId) {
    const url = `${ApiEndpoints.baseUrl}/api/v1/verifications/${verificationId}/reason`;
    const response = await apiClient.post(url);
    return response.data;
  },

  async runFusion(verificationId) {
    const url = `${ApiEndpoints.baseUrl}/api/v1/verifications/${verificationId}/fusion`;
    const response = await apiClient.post(url);
    return response.data;
  },

  async getLatestFusion(verificationId) {
    const url = `${ApiEndpoints.baseUrl}/api/v1/verifications/${verificationId}/fusion/latest`;
    const response = await apiClient.get(url);
    return response.data;
  },
};
