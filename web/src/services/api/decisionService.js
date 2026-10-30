import apiClient from './apiClient';
import { ApiEndpoints } from '../../constants/apiEndpoints';

export const decisionService = {
  async recordDecision(verificationId, decisionData) {
    const payload = {
      decision: decisionData.decision,
      notes: decisionData.notes?.trim() || null,
      decision_reason: decisionData.notes?.trim() || null,
      rejection_reasons: decisionData.rejectionReasons || [],
      action_taken: decisionData.actionTaken || decisionData.action || null,
    };

    const response = await apiClient.post(
      ApiEndpoints.verificationDecision(verificationId),
      payload
    );
    return response.data;
  },

  async listDecisions(verificationId) {
    const response = await apiClient.get(
      ApiEndpoints.verificationDecisions(verificationId)
    );
    return response.data;
  },
};
