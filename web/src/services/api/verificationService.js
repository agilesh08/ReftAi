import apiClient from './apiClient';
import { ApiEndpoints } from '../../constants/apiEndpoints';
import { normalizeDashboardItem } from './dashboardService';

export const verificationService = {
  async createVerificationSession(sessionPayload) {
    const payload = {
      product_id: sessionPayload.productId || sessionPayload.product_id,
      workflow_id: sessionPayload.workflowId || sessionPayload.workflow_id,
      order_id: (sessionPayload.orderId || sessionPayload.order_id).trim(),
      customer_name: sessionPayload.customerName || sessionPayload.customer_name || null,
      customer_contact:
        sessionPayload.customerContact ||
        sessionPayload.customerEmail ||
        sessionPayload.customer_contact ||
        null,
      refund_reason: sessionPayload.reason || sessionPayload.refund_reason || null,
      refund_amount:
        sessionPayload.refundAmount !== undefined
          ? parseFloat(sessionPayload.refundAmount)
          : undefined,
      max_attempts: parseInt(sessionPayload.maxAttempts || sessionPayload.max_attempts || 3, 10),
    };

    const response = await apiClient.post(ApiEndpoints.verifications, payload);
    const data = response.data;

    // Extract token from verification_id or customer_link
    let token = data.verification_id;
    if (data.customer_link && data.customer_link.includes('/v/')) {
      token = data.customer_link.split('/v/')[1].split('?')[0];
    } else if (data.customer_link && data.customer_link.includes('/verify/')) {
      token = data.customer_link.split('/verify/')[1].split('?')[0];
    }

    return {
      id: data.id,
      verificationId: data.verification_id,
      verification_id: data.verification_id,
      token: token || data.verification_id,
      orderId: data.order_id,
      customerName: data.customer_name,
      customerContact: data.customer_contact,
      customerEmail: data.customer_contact,
      refundAmount: Number(data.refund_amount) || 0,
      reason: data.refund_reason,
      status: data.status,
      customerLink: data.customer_link,
      customer_link: data.customer_link,
      createdAt: data.created_at,
      expiresAt: data.expires_at,
    };
  },

  async getVerification(id) {
    const response = await apiClient.get(ApiEndpoints.verificationDetail(id));
    return normalizeDashboardItem(response.data);
  },

  async cancelVerification(id) {
    const response = await apiClient.post(`${ApiEndpoints.baseUrl}/api/v1/verifications/${id}/cancel`);
    return response.data;
  },

  async holdVerification(id, { durationSeconds = null } = {}) {
    const response = await apiClient.post(ApiEndpoints.verificationHold(id), {
      duration_seconds: durationSeconds,
    });
    return response.data;
  },

  async resumeVerification(id) {
    const response = await apiClient.post(ApiEndpoints.verificationResume(id));
    return response.data;
  },

  async deleteVerification(id) {
    const response = await apiClient.delete(ApiEndpoints.verificationDelete(id));
    return response.data;
  },
};
