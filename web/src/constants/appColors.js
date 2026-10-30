// Reft.AI Color Palette - Mirrored strictly from Flutter AppColors (M13 Material 3 Specification)

export const AppColors = {
  // Brand / Theme Colors
  primary: '#6A89A7', // Refined Slate Blue
  primaryLight: '#BDDDFC', // Soft Ice Blue
  primaryDark: '#4A6B8A', // Deep Slate Blue
  secondary: '#88BDF2', // Sky Blue Accent
  darkNeutral: '#384959', // Deep Slate Navy Text

  // Surfaces & Backgrounds
  background: '#F6F9FC', // Modern clean light blue-grey
  surface: '#FFFFFF',
  surfaceVariant: '#F1F5F9',
  border: '#E2E8F0',
  borderSubtle: '#EDF2F7',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',

  // Machine Assessment State Colors (Strictly separate from Merchant Decision)
  assessmentConsistent: '#059669', // Modern Emerald Green
  assessmentConsistentBg: '#ECFDF5',
  assessmentReviewRequired: '#D97706', // Amber
  assessmentReviewRequiredBg: '#FFFBEB',
  assessmentInconsistent: '#DC2626', // Crimson Red
  assessmentInconsistentBg: '#FEF2F2',

  // Merchant Decision Colors
  decisionApproved: '#047857', // Deep Emerald
  decisionApprovedBg: '#ECFDF5',
  decisionRejected: '#B91C1C', // Deep Crimson
  decisionRejectedBg: '#FEF2F2',
  decisionManualReview: '#0369A1', // Deep Ocean Blue
  decisionManualReviewBg: '#F0F9FF',

  // Session Status Colors
  statusCreated: '#64748B',
  statusInProgress: '#0284C7',
  statusAnalyzed: '#7C3AED',
  statusCompleted: '#059669',
  statusExpired: '#64748B',
  statusCancelled: '#DC2626',
  statusHeld: '#E65100', // Amber/Orange for On Hold
  statusHeldBg: '#FFF3E0',

  // Helpers
  forAssessment: (state) => {
    switch (state?.toUpperCase()) {
      case 'EVIDENCE_CONSISTENT':
        return AppColors.assessmentConsistent;
      case 'REVIEW_REQUIRED':
        return AppColors.assessmentReviewRequired;
      case 'INCONSISTENCY_DETECTED':
        return AppColors.assessmentInconsistent;
      default:
        return AppColors.textSecondary;
    }
  },

  forAssessmentBg: (state) => {
    switch (state?.toUpperCase()) {
      case 'EVIDENCE_CONSISTENT':
        return AppColors.assessmentConsistentBg;
      case 'REVIEW_REQUIRED':
        return AppColors.assessmentReviewRequiredBg;
      case 'INCONSISTENCY_DETECTED':
        return AppColors.assessmentInconsistentBg;
      default:
        return AppColors.surfaceVariant;
    }
  },

  forDecision: (decision) => {
    switch (decision?.toUpperCase()) {
      case 'HOLD':
      case 'HELD':
        return AppColors.statusHeld;
      case 'REFUND_APPROVED':
      case 'APPROVED':
        return AppColors.decisionApproved;
      case 'REFUND_REJECTED':
      case 'REJECTED':
        return AppColors.decisionRejected;
      case 'MANUAL_REVIEW':
        return AppColors.decisionManualReview;
      default:
        return AppColors.textSecondary;
    }
  },

  forDecisionBg: (decision) => {
    switch (decision?.toUpperCase()) {
      case 'HOLD':
      case 'HELD':
        return AppColors.statusHeldBg;
      case 'REFUND_APPROVED':
      case 'APPROVED':
        return AppColors.decisionApprovedBg;
      case 'REFUND_REJECTED':
      case 'REJECTED':
        return AppColors.decisionRejectedBg;
      case 'MANUAL_REVIEW':
        return AppColors.decisionManualReviewBg;
      default:
        return AppColors.surfaceVariant;
    }
  },

  forStatus: (status) => {
    switch (status?.toUpperCase()) {
      case 'CREATED':
        return AppColors.statusCreated;
      case 'IN_PROGRESS':
        return AppColors.statusInProgress;
      case 'READY_FOR_ANALYSIS':
      case 'ANALYZED':
        return AppColors.statusAnalyzed;
      case 'COMPLETED':
        return AppColors.statusCompleted;
      case 'EXPIRED':
        return AppColors.statusExpired;
      case 'CANCELLED':
        return AppColors.statusCancelled;
      case 'HELD':
        return AppColors.statusHeld;
      default:
        return AppColors.textSecondary;
    }
  },
};
