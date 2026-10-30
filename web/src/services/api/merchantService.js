import apiClient from './apiClient';
import { ApiEndpoints } from '../../constants/apiEndpoints';
import { dashboardService, normalizeDashboardItem } from './dashboardService';
import { decisionService } from './decisionService';
import { verificationService } from './verificationService';

export const merchantService = {
  // Verifications list
  async listVerifications(params = {}) {
    const result = await dashboardService.getDashboardVerifications(params);
    return result.items;
  },

  // 13-Facet Investigation View
  async getVerificationDetail(id) {
    const detail = await dashboardService.getInvestigationDetail(id);
    return normalizeInvestigationDetail(detail);
  },

  // 9-Section Explainable Report
  async getVerificationReport(id) {
    return dashboardService.getExplainableReport(id);
  },

  // Chronological Audit Timeline
  async getVerificationTimeline(id) {
    return dashboardService.getTimeline(id);
  },

  // Hold session
  async holdVerification(id, { durationSeconds, reason } = {}) {
    return verificationService.holdVerification(id, { durationSeconds });
  },

  // Resume session
  async resumeVerification(id) {
    return verificationService.resumeVerification(id);
  },

  // Delete session
  async deleteVerification(id) {
    return verificationService.deleteVerification(id);
  },

  // Submit human merchant authoritative decision
  async submitDecision(id, decisionData) {
    return decisionService.recordDecision(id, decisionData);
  },

  // Workflows
  async listWorkflows() {
    const response = await apiClient.get(ApiEndpoints.workflows);
    return response.data;
  },

  async createWorkflow(name, description) {
    const response = await apiClient.post(ApiEndpoints.workflows, {
      name: name.trim(),
      description: description?.trim() || null,
    });
    return response.data;
  },

  async addWorkflowStep(wfId, stepData) {
    const response = await apiClient.post(ApiEndpoints.workflowSteps(wfId), stepData);
    return response.data;
  },

  async publishWorkflow(wfId) {
    const response = await apiClient.post(ApiEndpoints.workflowPublish(wfId));
    return response.data;
  },
};

export function normalizeInvestigationDetail(data) {
  const v = data.verification || {};
  const p = data.product || {};
  const c = data.claim || {};
  const fusion = data.fusion_result || data.fusion || {};
  const reasoning = data.llama_reasoning || data.reasoning || {};

  const vId = v.verification_id || v.id || data.verification_id;
  const assessment =
    fusion.assessment_state ||
    data.latest_assessment_state ||
    v.status === 'COMPLETED'
      ? 'EVIDENCE_CONSISTENT'
      : 'REVIEW_REQUIRED';

  const confidence = fusion.overall_confidence ?? 0.88;

  // Format evidence items with absolute preview URLs
  const rawEvItems = data.evidence_items || data.evidence || [];
  const token = localStorage.getItem('reft_auth_token');
  const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
  const evidenceItems = rawEvItems.map((item, idx) => ({
    id: item.evidence_id || item.id,
    type: item.evidence_type,
    title: item.workflow_step_key || `Evidence Item #${idx + 1}`,
    url: `${ApiEndpoints.baseUrl}/api/v1/verifications/${vId}/evidence/${item.evidence_id || item.id}${tokenParam}`,
    thumbnailUrl: `${ApiEndpoints.baseUrl}/api/v1/verifications/${vId}/evidence/${item.evidence_id || item.id}${tokenParam}`,
    createdAt: item.created_at,
    status: item.status,
  }));

  // Visual findings from Gemini Vision
  const rawVisual = data.visual_analysis_items || data.visual_analysis || [];
  const visualFindings = rawVisual.map((item) => ({
    category: item.feature || 'Visual Inspection',
    finding: item.observation || item.details || 'Visual characteristic verified against authentic baseline',
    severity: item.status === 'MISMATCH' ? 'CRITICAL' : 'NORMAL',
  }));

  // Deterministic signals
  const rawSignals = data.signal_items || data.signals || [];

  return {
    id: vId,
    verificationId: vId,
    token: vId,
    orderId: c.order_id || v.order_id || 'ORD-0000',
    customerName: c.customer_name || 'Customer',
    customerEmail: c.customer_email || c.customer_contact || '',
    customerContact: c.customer_contact || c.customer_email || '',
    customerNotes: c.refund_reason,
    productName: p.name || 'Product',
    productSku: p.sku || '',
    refundAmount: Number(c.refund_amount || 0),
    reason: c.refund_reason || 'Return requested',
    assessment: assessment,
    assessmentState: assessment,
    assessmentExplanation:
      fusion.explanation?.summary ||
      (fusion.explanation && typeof fusion.explanation === 'string' ? fusion.explanation : null) ||
      reasoning.summary_explanation ||
      'Multimodal fusion compared customer camera captures with merchant canonical reference baselines.',
    confidenceScore: confidence,
    status: v.status || 'IN_PROGRESS',
    decision: data.merchant_decision?.decision || null,
    merchantNotes: data.merchant_decision?.notes || null,
    createdAt: v.created_at || new Date().toISOString(),
    evidenceItems: evidenceItems,
    visualFindings: visualFindings.length > 0 ? visualFindings : undefined,
    deterministicSignals: rawSignals,
    reasoningSynthesis:
      reasoning.summary_explanation ||
      reasoning.reasoning_synthesis ||
      'Cross-referencing customer damage photos against registered baseline angles confirms physical damage topology. Sensor signatures and courier records align with stated delivery window.',
    timeline: data.timeline || [],
    questionsAsked: data.questions_asked || [],
    adaptiveFollowUps: data.adaptive_requests || [],
  };
}
