// API Endpoints for Reft.AI Refund Evidence Verification System
// Mirroring ApiEndpoints from Flutter

let defaultBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
let currentBaseUrl = localStorage.getItem('reft_custom_base_url') || defaultBaseUrl;

export const ApiEndpoints = {
  get baseUrl() {
    return currentBaseUrl;
  },

  setBaseUrl(url) {
    let cleaned = (url || '').trim();
    if (!cleaned) return;
    if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://')) {
      cleaned = `http://${cleaned}`;
    }
    while (cleaned.endsWith('/')) {
      cleaned = cleaned.substring(0, cleaned.length - 1);
    }
    if (cleaned.endsWith('/api/v1')) {
      cleaned = cleaned.substring(0, cleaned.length - 7);
    } else if (cleaned.endsWith('/api')) {
      cleaned = cleaned.substring(0, cleaned.length - 4);
    }
    while (cleaned.endsWith('/')) {
      cleaned = cleaned.substring(0, cleaned.length - 1);
    }
    currentBaseUrl = cleaned;
    localStorage.setItem('reft_custom_base_url', currentBaseUrl);
  },

  // Auth
  get login() {
    return `${this.baseUrl}/api/v1/auth/login`;
  },

  // Products
  get products() {
    return `${this.baseUrl}/api/v1/products`;
  },
  productDetail: (id) => `${ApiEndpoints.baseUrl}/api/v1/products/${id}`,
  productCompleteness: (id) => `${ApiEndpoints.baseUrl}/api/v1/products/${id}/completeness`,
  productReferences: (id) => `${ApiEndpoints.baseUrl}/api/v1/products/${id}/references`,
  productReferenceFile: (id, angle) => {
    const token = localStorage.getItem('reft_auth_token');
    const base = `${ApiEndpoints.baseUrl}/api/v1/products/${id}/references/${angle}/file`;
    return token ? `${base}?token=${encodeURIComponent(token)}` : base;
  },

  // Merchant Endpoints
  get verifications() {
    return `${this.baseUrl}/api/v1/verifications`;
  },
  verificationDetail: (id) => `${ApiEndpoints.baseUrl}/api/v1/verifications/${id}`,
  verificationDashboard: (id) => `${ApiEndpoints.baseUrl}/api/v1/verifications/${id}/dashboard`,
  verificationReport: (id) => `${ApiEndpoints.baseUrl}/api/v1/verifications/${id}/report`,
  verificationTimeline: (id) => `${ApiEndpoints.baseUrl}/api/v1/verifications/${id}/timeline`,
  verificationDecision: (id) => `${ApiEndpoints.baseUrl}/api/v1/verifications/${id}/decision`,
  verificationDecisions: (id) => `${ApiEndpoints.baseUrl}/api/v1/verifications/${id}/decisions`,
  verificationHold: (id) => `${ApiEndpoints.baseUrl}/api/v1/verifications/${id}/hold`,
  verificationResume: (id) => `${ApiEndpoints.baseUrl}/api/v1/verifications/${id}/resume`,
  verificationDelete: (id) => `${ApiEndpoints.baseUrl}/api/v1/verifications/${id}`,

  // Public Customer Endpoints
  customerOverview: (token) => `${ApiEndpoints.baseUrl}/api/v1/public/verifications/${token}`,
  customerStart: (token) => `${ApiEndpoints.baseUrl}/api/v1/public/verifications/${token}/start`,
  customerWorkflow: (token) => `${ApiEndpoints.baseUrl}/api/v1/public/verifications/${token}/workflow`,
  customerEvidenceImage: (token) => `${ApiEndpoints.baseUrl}/api/v1/public/verifications/${token}/evidence/image`,
  customerEvidenceText: (token) => `${ApiEndpoints.baseUrl}/api/v1/public/verifications/${token}/evidence/text`,
  customerEvidenceList: (token) => `${ApiEndpoints.baseUrl}/api/v1/public/verifications/${token}/evidence`,
  customerEvidenceFile: (token, evidenceId) => `${ApiEndpoints.baseUrl}/api/v1/public/verifications/${token}/evidence/${evidenceId}`,
  customerEvidenceRequests: (token) => `${ApiEndpoints.baseUrl}/api/v1/public/verifications/${token}/evidence-requests`,
  customerFulfillRequest: (token, requestId) => `${ApiEndpoints.baseUrl}/api/v1/public/verifications/${token}/evidence-requests/${requestId}/fulfill`,
  customerSignals: (token) => `${ApiEndpoints.baseUrl}/api/v1/public/verifications/${token}/signals`,
  customerFusion: (token) => `${ApiEndpoints.baseUrl}/api/v1/public/verifications/${token}/fusion`,
  customerAnalyze: (token) => `${ApiEndpoints.baseUrl}/api/v1/public/verifications/${token}/analyze`,
  customerComplete: (token) => `${ApiEndpoints.baseUrl}/api/v1/public/verifications/${token}/complete`,
  customerExtractPaymentProof: (token) => `${ApiEndpoints.baseUrl}/api/v1/public/verifications/${token}/extract-payment-proof`,
  customerSubmitPaymentProof: (token) => `${ApiEndpoints.baseUrl}/api/v1/public/verifications/${token}/payment-proof`,

  // Workflows
  get workflows() {
    return `${this.baseUrl}/api/v1/workflows`;
  },
  workflowDetail: (id) => `${ApiEndpoints.baseUrl}/api/v1/workflows/${id}`,
  workflowSteps: (id) => `${ApiEndpoints.baseUrl}/api/v1/workflows/${id}/steps`,
  workflowStepDetail: (id, stepId) => `${ApiEndpoints.baseUrl}/api/v1/workflows/${id}/steps/${stepId}`,
  workflowPublish: (id) => `${ApiEndpoints.baseUrl}/api/v1/workflows/${id}/publish`,
};
