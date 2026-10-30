import apiClient from './apiClient';
import { ApiEndpoints } from '../../constants/apiEndpoints';

export const dashboardService = {
  async getDashboardVerifications(params = {}) {
    const query = {
      page: params.page || 1,
      page_size: params.pageSize || 50,
      status: params.status && params.status !== 'ALL' ? params.status : undefined,
      assessment_state: params.assessment && params.assessment !== 'ALL' ? params.assessment : undefined,
      search: params.search?.trim() || undefined,
    };

    const response = await apiClient.get(ApiEndpoints.verifications, { params: query });
    const data = response.data;

    // Backend returns either DashboardVerificationListResponse { items, total, page, page_size } or List[VerificationResponse]
    const rawItems = Array.isArray(data) ? data : data.items || [];
    return {
      items: rawItems.map(normalizeDashboardItem),
      total: data.total ?? rawItems.length,
      page: data.page ?? 1,
      pageSize: data.page_size ?? rawItems.length,
    };
  },

  async getInvestigationDetail(verificationId) {
    const response = await apiClient.get(ApiEndpoints.verificationDashboard(verificationId));
    return response.data;
  },

  async getExplainableReport(verificationId) {
    const response = await apiClient.get(ApiEndpoints.verificationReport(verificationId));
    return response.data;
  },

  async getTimeline(verificationId) {
    const response = await apiClient.get(ApiEndpoints.verificationTimeline(verificationId));
    return response.data;
  },
};

export function normalizeDashboardItem(item) {
  const vId = item.verification_id || item.verificationId || item.id;
  const rawStatus = item.status || 'CREATED';
  const rawAssessment =
    item.latest_assessment_state || item.assessment_state || item.assessmentState || item.assessment || 'REVIEW_REQUIRED';
  const rawDecision = item.latest_decision || item.decision || null;

  return {
    id: vId,
    verificationId: vId,
    token: vId,
    orderId: item.order_id || item.orderId || 'ORD-0000',
    customerName: item.customer_name || item.claim?.customer_name || item.customer_email || 'Customer',
    customerEmail: item.customer_email || item.claim?.customer_email || '',
    customerContact: item.customer_contact || item.customer_email || '',
    productName: item.product_name || item.product?.name || 'Verified Product',
    productSku: item.product?.sku || item.productSku || '',
    refundAmount: Number(item.refund_amount ?? item.refundAmount ?? item.product?.price ?? 0),
    status: rawStatus,
    assessment: rawAssessment,
    assessmentState: rawAssessment,
    decision: rawDecision,
    confidenceScore: item.confidence ?? 0.88,
    createdAt: item.created_at || item.createdAt || new Date().toISOString(),
    isHeld: rawStatus === 'HELD' || Boolean(item.held_at),
    holdReason: item.held_by ? `Held by ${item.held_by}` : null,
    evidenceCount: item.evidence_count ?? (item.evidenceItems ? item.evidenceItems.length : 0),
    evidenceItems: item.evidence_items || item.evidenceItems || [],
  };
}
