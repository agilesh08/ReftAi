import React from 'react';
import { ShieldCheck, AlertTriangle, AlertOctagon, HelpCircle } from 'lucide-react';
import { AppColors } from '../../constants/appColors';

export function AssessmentBadge({ assessmentState, confidence, compact = false }) {
  const code = (assessmentState || 'PENDING').toUpperCase();
  const color = AppColors.forAssessment(code);
  const bgColor = AppColors.forAssessmentBg(code);

  const getDetails = () => {
    switch (code) {
      case 'EVIDENCE_CONSISTENT':
        return {
          label: 'Evidence Consistent',
          Icon: ShieldCheck,
        };
      case 'REVIEW_REQUIRED':
        return {
          label: 'Review Required',
          Icon: AlertTriangle,
        };
      case 'INCONSISTENCY_DETECTED':
        return {
          label: 'Inconsistency Detected',
          Icon: AlertOctagon,
        };
      default:
        return {
          label: 'Assessment Pending',
          Icon: HelpCircle,
        };
    }
  };

  const { label, Icon } = getDetails();
  const confidencePercent =
    confidence !== null && confidence !== undefined
      ? `${Math.round(Number(confidence) * 100)}%`
      : null;

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-bold rounded-lg border ${
        compact ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs'
      }`}
      style={{
        color: color,
        backgroundColor: bgColor,
        borderColor: `${color}40`,
      }}
    >
      <Icon className={compact ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      <span>{label}</span>
      {confidencePercent && (
        <span
          className="ml-0.5 text-[10px] font-semibold opacity-90 px-1 py-0.2 rounded"
          style={{ backgroundColor: `${color}18` }}
        >
          {confidencePercent}
        </span>
      )}
    </span>
  );
}
