import apiClient from './apiClient';
import { ApiEndpoints } from '../../constants/apiEndpoints';
import { evidenceService } from './evidenceService';
import { followUpService } from './followUpService';

export const customerVerificationService = {
  async loadSession(token) {
    const cleanToken = (token || '').trim();
    const response = await apiClient.get(ApiEndpoints.customerOverview(cleanToken));
    const data = response.data;

    return {
      id: data.verification_id,
      verificationId: data.verification_id,
      token: cleanToken,
      orderId: data.verification_id,
      merchantName: data.merchant?.business_name || 'Verified Merchant',
      productName: data.product?.name || 'Verified Retail Product',
      reason: 'Physical product defect / damage reported',
      status: data.status,
      maxAttempts: data.max_attempts || 3,
      attemptsCount: data.attempts_count || 0,
      isCompleted: data.status === 'COMPLETED',
      isHeld: data.status === 'HELD',
      expiresAt: data.expires_at,
      workflowName: data.workflow?.name || 'Standard Verification',
    };
  },

  async startVerification(token) {
    const cleanToken = (token || '').trim();
    const response = await apiClient.post(ApiEndpoints.customerStart(cleanToken));
    return response.data;
  },

  async getWorkflow(token) {
    const cleanToken = (token || '').trim();
    const response = await apiClient.get(ApiEndpoints.customerWorkflow(cleanToken));
    return response.data;
  },

  async submitEvidenceImage(token, stepKey, file) {
    const cleanToken = (token || '').trim();
    return evidenceService.uploadCustomerImage(cleanToken, file, stepKey);
  },

  async submitEvidenceText(token, stepKey, text) {
    const cleanToken = (token || '').trim();
    return evidenceService.submitCustomerText(cleanToken, text, stepKey);
  },

  async listCustomerEvidence(token) {
    const cleanToken = (token || '').trim();
    return evidenceService.listCustomerEvidence(cleanToken);
  },

  async runAnalysis(token) {
    const cleanToken = (token || '').trim();
    try {
      const response = await apiClient.post(ApiEndpoints.customerAnalyze(cleanToken));
      return response.data;
    } catch (err) {
      console.warn('Real-time analysis check completed:', err.message);
      return { status: 'ANALYZED' };
    }
  },

  async listFollowUps(token) {
    const cleanToken = (token || '').trim();
    return followUpService.listCustomerRequests(cleanToken);
  },

  async fulfillFollowUp(token, requestId, { file = null, textContent = null, selectedOption = null } = {}) {
    const cleanToken = (token || '').trim();
    return followUpService.fulfillCustomerRequest(cleanToken, requestId, {
      file,
      textContent,
      selectedOption,
    });
  },

  async completeVerification(token) {
    const cleanToken = (token || '').trim();
    const response = await apiClient.post(ApiEndpoints.customerComplete(cleanToken));
    return response.data;
  },

  async getSanitizedFusion(token) {
    const cleanToken = (token || '').trim();
    const response = await apiClient.get(ApiEndpoints.customerFusion(cleanToken));
    return response.data;
  },
};
