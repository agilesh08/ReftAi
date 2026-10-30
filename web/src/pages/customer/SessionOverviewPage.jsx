import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Package,
  Camera,
  Clock,
  ArrowRight,
  AlertCircle,
  PauseCircle,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { useCustomerFlow } from '../../context/CustomerFlowContext';
import { CustomerHeader } from '../../components/common/CustomerHeader';
import { formatCurrency } from '../../utils/formatters';
import { customerVerificationService } from '../../services/api/customerVerificationService';

export function SessionOverviewPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { loadSession, session, loading, error } = useCustomerFlow();

  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    if (token) {
      loadSession(token);
    }
  }, [token, loadSession]);

  if (loading) {
    return (
      <div className="min-h-screen bg-appBg flex flex-col items-center justify-center p-4">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mb-3" />
        <span className="text-xs font-semibold text-slate-500">
          Loading verification session...
        </span>
      </div>
    );
  }

  // Session not found
  if (error || !session) {
    return (
      <div className="min-h-screen bg-appBg flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl border border-appBorder shadow-sm text-center max-w-md w-full">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-darkNeutral">Verification Session Not Found</h2>
          <p className="text-xs text-slate-500 mt-1 mb-6">
            The verification code <strong>{token}</strong> is either invalid, expired, or was already closed.
          </p>
          <button
            onClick={() => navigate('/')}
            className="w-full py-2.5 bg-primary text-white rounded-xl text-xs font-bold shadow-xs hover:bg-primary/90 transition-colors"
          >
            Enter a Different Code
          </button>
        </div>
      </div>
    );
  }

  // Session is HELD by merchant
  if (session.status === 'HELD') {
    return (
      <div className="min-h-screen bg-appBg flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl border border-appBorder shadow-sm text-center max-w-md w-full">
          <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center mx-auto mb-3">
            <PauseCircle className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-darkNeutral">Verification Temporarily On Hold</h2>
          <p className="text-xs text-slate-600 mt-2 mb-2">
            Your merchant has temporarily paused this verification session.
          </p>
          {session.holdReason && (
            <div className="p-3 bg-orange-50 rounded-xl border border-orange-200 text-xs text-orange-800 text-left mb-6">
              <span className="font-bold block mb-0.5">Merchant Message:</span>
              "{session.holdReason}"
            </div>
          )}
          <p className="text-[11px] text-slate-400 mb-6">
            Please contact merchant support or check back later once your claim is resumed.
          </p>
          <button
            onClick={() => navigate('/')}
            className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
          >
            Back to Gateway
          </button>
        </div>
      </div>
    );
  }

  // Session is already COMPLETED (Crucial requirement: Prevent re-submission!)
  if (session.status === 'COMPLETED') {
    return (
      <div className="min-h-screen bg-appBg flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl border border-appBorder shadow-sm text-center max-w-md w-full">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-darkNeutral">Verification Already Submitted</h2>
          <p className="text-xs text-slate-600 mt-2 mb-4 leading-relaxed">
            Evidence for Order <strong>{session.orderId}</strong> has already been received and finalized by Reft.AI.
          </p>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-left text-xs mb-6 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">Order ID:</span>
              <span className="font-bold text-slate-700">{session.orderId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Item:</span>
              <span className="font-medium text-slate-700 truncate max-w-[200px]">{session.productName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Resolution:</span>
              <span className="font-bold text-emerald-600">{session.decision || 'Under Merchant Review'}</span>
            </div>
          </div>
          <button
            onClick={() => navigate('/')}
            className="w-full py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold transition-colors"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  const handleStart = async () => {
    try {
      if (token) {
        await customerVerificationService.startVerification(token);
      }
    } catch (e) {
      console.warn('Session start note:', e.message);
    }
    navigate(`/verify/${token}/workflow`);
  };

  return (
    <div className="min-h-screen bg-appBg flex flex-col justify-between">
      <CustomerHeader orderId={session.orderId} />

      <main className="flex-1 max-w-xl md:max-w-2xl lg:max-w-3xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col justify-center transition-all">
        <div className="bg-white rounded-3xl border border-appBorder shadow-sm p-6 sm:p-8 space-y-6">
          {/* Top Merchant Brand & Item */}
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-[11px] font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Official Return Verification</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-darkNeutral">
              Verify Refund for Your Order
            </h1>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Please submit live photos of your damaged or defective item for automated verification.
            </p>
          </div>

          {/* Claim Summary Card */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" />
                <span className="font-bold text-slate-800">{session.productName}</span>
              </div>
              <span className="font-bold text-emerald-600 text-sm">
                {formatCurrency(session.refundAmount)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <span className="text-slate-400 block">Order Number</span>
                <span className="font-mono font-semibold text-slate-700">{session.orderId}</span>
              </div>
              <div>
                <span className="text-slate-400 block">Claim Reason</span>
                <span className="font-semibold text-slate-700 truncate block">{session.reason}</span>
              </div>
            </div>
          </div>

          {/* Verification Guidelines */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
              What You Will Need
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-3 p-3 bg-slate-50/60 rounded-xl border border-slate-200">
                <Camera className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-darkNeutral block">Live Camera Access</span>
                  <span className="text-[11px] text-slate-500 block">
                    Take clear, well-lit photos directly using your phone or webcam.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-slate-50/60 rounded-xl border border-slate-200">
                <Package className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-darkNeutral block">Product & Shipping Box</span>
                  <span className="text-[11px] text-slate-500 block">
                    Have the damaged product and original shipping carton nearby.
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-slate-50/60 rounded-xl border border-slate-200">
                <Clock className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-darkNeutral block">Fast 2-Minute Review</span>
                  <span className="text-[11px] text-slate-500 block">
                    No account needed. Instant visual analysis delivered to your merchant.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <button
              onClick={handleStart}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
            >
              <span>Begin Evidence Verification</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="text-center text-[10px] text-slate-400 flex items-center justify-center gap-1">
            <Lock className="w-3 h-3" />
            <span>End-to-end encrypted session • No registration required</span>
          </div>
        </div>
      </main>
    </div>
  );
}
