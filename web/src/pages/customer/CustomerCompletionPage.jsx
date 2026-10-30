import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Package,
  ShieldCheck,
  ArrowRight,
  Clock,
  Home,
  Check,
} from 'lucide-react';
import { useCustomerFlow } from '../../context/CustomerFlowContext';
import { CustomerHeader } from '../../components/common/CustomerHeader';

export function CustomerCompletionPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { session } = useCustomerFlow();

  const orderId = session?.orderId || 'ORD-94821';
  const productName = session?.productName || 'Smart Wireless Headset';

  return (
    <div className="min-h-screen bg-appBg flex flex-col justify-between">
      <CustomerHeader orderId={orderId} />

      <main className="flex-1 max-w-xl w-full mx-auto px-4 sm:px-6 py-8 flex flex-col justify-center">
        <div className="bg-white rounded-3xl border border-appBorder shadow-sm p-6 sm:p-10 text-center space-y-6">
          {/* Success Check Ring */}
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 ring-8 ring-emerald-50 mb-2">
            <CheckCircle2 className="w-12 h-12" />
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Evidence Received & Finalized
            </span>
            <h1 className="text-2xl font-bold text-darkNeutral">
              Verification Submitted Successfully
            </h1>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
              Your live camera captures and claim details have been securely logged and delivered to your merchant for final refund processing.
            </p>
          </div>

          {/* Reference Card */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-left text-xs space-y-2">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <span className="text-slate-400 font-semibold">Reference Code:</span>
              <span className="font-mono font-bold text-primary text-sm">{token}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-semibold">Order Number:</span>
              <span className="font-bold text-slate-800">{orderId}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 font-semibold">Verified Product:</span>
              <span className="font-medium text-slate-700 truncate max-w-[200px]">{productName}</span>
            </div>
          </div>

          {/* Next Steps Info */}
          <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 text-left text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-primary">
              <Clock className="w-4 h-4" />
              What Happens Next?
            </div>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              The merchant will review the verification dossier and process your refund or replacement according to their policy. You will receive an update at your registered email address.
            </p>
          </div>

          {/* Home Button */}
          <div className="pt-2">
            <button
              onClick={() => navigate('/')}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
            >
              <Home className="w-4 h-4" />
              <span>Back to Home</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
