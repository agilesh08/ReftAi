import React, { useState, useEffect } from 'react';
import { Gavel, CheckCircle2, XCircle, UserCheck } from 'lucide-react';
import { AppColors } from '../../constants/appColors';

const REJECTION_REASONS = [
  'Evidence shows no defect or damage',
  'Item does not match product reference specifications',
  'Evidence incomplete or unverified after follow-up',
  'Order delivery and payment signal mismatch',
  'Claim outside merchant return window',
];

export function DecisionDialog({
  isOpen,
  session,
  verificationId,
  initialDecision = 'REFUND_APPROVED',
  onConfirm,
  onDecisionSubmit,
  onClose,
  isSubmitting = false,
}) {
  const shouldRender = isOpen !== undefined ? Boolean(isOpen) : Boolean(session || verificationId);
  if (!shouldRender) {
    return null;
  }

  const [selectedDecision, setSelectedDecision] = useState(initialDecision);
  const [notes, setNotes] = useState('');
  const [selectedRejectionReasons, setSelectedRejectionReasons] = useState([]);

  // Keyboard accessibility: ESC closes modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isSubmitting]);

  const vId = verificationId || session?.verificationId || session?.verification_id || session?.id || '';
  const ordId = session?.orderId || session?.order_id || '';

  const toggleReason = (reason) => {
    setSelectedRejectionReasons((prev) =>
      prev.includes(reason) ? prev.filter((r) => r !== reason) : [...prev, reason]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const actionTaken =
      selectedDecision === 'REFUND_APPROVED'
        ? 'FULL_REFUND'
        : selectedDecision === 'REFUND_REJECTED'
        ? 'NO_REFUND'
        : 'ESCALATE_MANUAL_REVIEW';

    const payload = {
      decision: selectedDecision,
      notes: notes.trim(),
      decisionReason: notes.trim(),
      rejectionReasons: selectedDecision === 'REFUND_REJECTED' ? selectedRejectionReasons : [],
      actionTaken,
    };

    if (onDecisionSubmit) {
      onDecisionSubmit(payload);
    } else if (onConfirm) {
      onConfirm(payload);
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !isSubmitting) {
      onClose?.();
    }
  };

  const decisionOptions = [
    {
      value: 'REFUND_APPROVED',
      title: 'Approve Refund',
      subtitle: 'Authorize reimbursement to original customer payment method.',
      icon: CheckCircle2,
      color: AppColors.decisionApproved,
      bgColor: AppColors.decisionApprovedBg,
    },
    {
      value: 'REFUND_REJECTED',
      title: 'Reject Claim',
      subtitle: 'Deny refund request citing inconsistent evidence or policy terms.',
      icon: XCircle,
      color: AppColors.decisionRejected,
      bgColor: AppColors.decisionRejectedBg,
    },
    {
      value: 'MANUAL_REVIEW',
      title: 'Escalate for Senior Review',
      subtitle: 'Hold for tier-2 merchant investigation or physical parcel return.',
      icon: UserCheck,
      color: AppColors.decisionManualReview,
      bgColor: AppColors.decisionManualReviewBg,
    },
  ];

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="decision-dialog-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-appBorder overflow-y-auto max-h-[90vh]"
      >
        <div className="flex items-center gap-2.5 pb-3 border-b border-appBorder mb-4">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <Gavel className="w-5 h-5" />
          </div>
          <div>
            <h3 id="decision-dialog-title" className="text-base font-bold text-darkNeutral">
              Record Merchant Decision
            </h3>
            <p className="text-xs text-textSecondary font-mono">
              {vId} {ordId ? `• Order #${ordId}` : ''}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2.5">
            {decisionOptions.map((opt) => {
              const Icon = opt.icon;
              const isSelected = selectedDecision === opt.value;
              return (
                <div
                  key={opt.value}
                  onClick={() => setSelectedDecision(opt.value)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-start gap-3 ${
                    isSelected
                      ? 'border-2 shadow-sm'
                      : 'border-appBorder hover:border-slate-300 bg-white'
                  }`}
                  style={{
                    borderColor: isSelected ? opt.color : undefined,
                    backgroundColor: isSelected ? opt.bgColor : undefined,
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ backgroundColor: `${opt.color}15`, color: opt.color }}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-darkNeutral">{opt.title}</span>
                      <div
                        className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                          isSelected ? 'border-primary' : 'border-slate-300'
                        }`}
                      >
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                      </div>
                    </div>
                    <p className="text-[11px] text-textSecondary mt-0.5">{opt.subtitle}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Conditional Rejection Reasons */}
          {selectedDecision === 'REFUND_REJECTED' && (
            <div className="space-y-2 p-3 bg-red-50/50 rounded-xl border border-red-200">
              <label className="block text-xs font-bold text-red-800">
                Primary Justification for Denial
              </label>
              <div className="space-y-1.5">
                {REJECTION_REASONS.map((reason) => {
                  const isChecked = selectedRejectionReasons.includes(reason);
                  return (
                    <label
                      key={reason}
                      className="flex items-start gap-2 text-xs text-darkNeutral cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleReason(reason)}
                        className="rounded border-slate-300 text-red-600 focus:ring-red-500 mt-0.5"
                      />
                      <span>{reason}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Notes textarea */}
          <div>
            <label className="block text-xs font-semibold text-darkNeutral mb-1">
              Decision Notes & Audit Commentary (Optional)
            </label>
            <textarea
              rows={3}
              className="w-full px-3 py-2 text-xs sm:text-sm border border-appBorder rounded-xl focus:outline-none focus:border-primary"
              placeholder="e.g. Customer provided photographic evidence confirming crack on genuine merchandise."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Action buttons */}
          <div className="flex justify-end gap-2.5 pt-3 border-t border-appBorder">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-textSecondary hover:bg-surface-variant rounded-xl transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
              style={{
                backgroundColor:
                  selectedDecision === 'REFUND_REJECTED'
                    ? AppColors.decisionRejected
                    : AppColors.decisionApproved,
              }}
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Recording...</span>
                </>
              ) : (
                <span>Confirm Decision</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
