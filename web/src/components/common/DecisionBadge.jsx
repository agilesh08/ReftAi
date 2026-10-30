import React from 'react';
import { CheckCircle2, XCircle, UserCheck, PauseCircle, Clock } from 'lucide-react';
import { AppColors } from '../../constants/appColors';

export function DecisionBadge({ decision, compact = false }) {
  const code = (decision || 'AWAITING DECISION').toUpperCase();
  const color = AppColors.forDecision(code);
  const bgColor = AppColors.forDecisionBg(code);

  const getDetails = () => {
    switch (code) {
      case 'HOLD':
      case 'HELD':
        return { label: 'Session On Hold', Icon: PauseCircle };
      case 'REFUND_APPROVED':
      case 'APPROVED':
        return { label: 'Refund Approved', Icon: CheckCircle2 };
      case 'REFUND_REJECTED':
      case 'REJECTED':
        return { label: 'Refund Rejected', Icon: XCircle };
      case 'MANUAL_REVIEW':
        return { label: 'Manual Review Escalate', Icon: UserCheck };
      default:
        return { label: 'Awaiting Decision', Icon: Clock };
    }
  };

  const { label, Icon } = getDetails();

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
    </span>
  );
}
