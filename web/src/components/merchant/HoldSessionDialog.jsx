import React, { useState, useEffect } from 'react';
import { PauseCircle } from 'lucide-react';

const DURATIONS = [
  { label: '1 hour', seconds: 3600 },
  { label: '6 hours', seconds: 21600 },
  { label: '24 hours', seconds: 86400 },
  { label: '3 days', seconds: 259200 },
  { label: 'Indefinite', seconds: null },
];

export function HoldSessionDialog({
  isOpen,
  session,
  verificationId,
  onConfirm,
  onClose,
  isHolding = false,
}) {
  // If explicitly closed or no session/ID provided, do not render
  const shouldRender = isOpen !== undefined ? Boolean(isOpen) : Boolean(session || verificationId);
  if (!shouldRender) {
    return null;
  }

  const [selectedSeconds, setSelectedSeconds] = useState(86400); // 24 hours default
  const [reason, setReason] = useState('');

  // Keyboard accessibility: ESC closes modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isHolding) {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isHolding]);

  const vId = verificationId || session?.verificationId || session?.verification_id || session?.id || '';
  const ordId = session?.orderId || session?.order_id || '';

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm?.({
      durationSeconds: selectedSeconds,
      reason: reason.trim() || null,
    });
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !isHolding) {
      onClose?.();
    }
  };

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hold-session-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-appBorder"
      >
        <div className="flex items-center gap-2.5 pb-3 border-b border-appBorder mb-4">
          <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
            <PauseCircle className="w-5 h-5" />
          </div>
          <div>
            <h3 id="hold-session-title" className="text-base font-bold text-darkNeutral">
              Hold Verification
            </h3>
            <p className="text-xs text-textSecondary font-mono">
              {vId} {ordId ? `• Order #${ordId}` : ''}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-xs text-textSecondary">
            Select duration to pause customer access to this verification:
          </p>

          <div className="flex flex-wrap gap-2">
            {DURATIONS.map((dur) => {
              const isSelected = selectedSeconds === dur.seconds;
              return (
                <button
                  key={dur.label}
                  type="button"
                  onClick={() => setSelectedSeconds(dur.seconds)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    isSelected
                      ? 'bg-orange-50 border-orange-500 text-orange-700 font-bold'
                      : 'bg-white border-appBorder text-darkNeutral hover:bg-surface-variant'
                  }`}
                >
                  {dur.label}
                </button>
              );
            })}
          </div>

          <div>
            <label className="block text-xs font-semibold text-darkNeutral mb-1">
              Hold Reason (Optional)
            </label>
            <input
              type="text"
              className="w-full px-3 py-2 text-xs sm:text-sm border border-appBorder rounded-xl focus:outline-none focus:border-orange-500"
              placeholder="e.g. Waiting for physical courier return"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-appBorder">
            <button
              type="button"
              onClick={onClose}
              disabled={isHolding}
              className="px-4 py-2 text-xs font-semibold text-textSecondary hover:bg-surface-variant rounded-xl transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isHolding}
              className="px-5 py-2 text-xs font-bold text-white bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
            >
              {isHolding ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Holding...</span>
                </>
              ) : (
                <span>Hold Session</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
