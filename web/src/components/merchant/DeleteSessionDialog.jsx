import React, { useEffect } from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';

export function DeleteSessionDialog({
  isOpen,
  session,
  verificationId,
  orderId,
  onConfirm,
  onClose,
  isDeleting = false,
  error = null,
}) {
  // If explicitly closed or no session/ID provided, do not render
  const shouldRender = isOpen !== undefined ? Boolean(isOpen) : Boolean(session || verificationId);
  if (!shouldRender) {
    return null;
  }

  // Keyboard accessibility: ESC closes modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isDeleting) {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isDeleting]);

  const vId = verificationId || session?.verificationId || session?.verification_id || session?.id || '';
  const ordId = orderId || session?.orderId || session?.order_id || '';

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !isDeleting) {
      onClose?.();
    }
  };

  return (
    <div
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-session-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-appBorder"
      >
        <div className="flex items-center gap-3 text-red-600 mb-3">
          <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 id="delete-session-title" className="text-base font-bold text-darkNeutral">
              Delete Verification Session?
            </h3>
            <p className="text-xs text-textSecondary font-mono">
              {vId} {ordId ? `• Order #${ordId}` : ''}
            </p>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-textSecondary mb-4 leading-relaxed">
          This action will permanently delete this verification session, including all uploaded evidence images, customer responses, and audit records. This cannot be undone.
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2.5 pt-3 border-t border-appBorder">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-xs font-semibold text-textSecondary hover:bg-surface-variant rounded-xl transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:bg-red-400 rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
          >
            {isDeleting ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Session</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
