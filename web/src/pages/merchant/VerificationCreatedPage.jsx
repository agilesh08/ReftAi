import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  ArrowRight,
  QrCode,
  ShieldCheck,
  Send,
  Home,
  Clock,
  Package,
} from 'lucide-react';
import { MerchantHeader } from '../../components/common/MerchantHeader';
import { formatCurrency } from '../../utils/formatters';

export function VerificationCreatedPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const session = location.state?.session;

  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Fallback if accessed directly without session state
  const token = session?.token || 'VR-2026-9041';
  const orderId = session?.orderId || 'ORD-94821';
  const customerName = session?.customerName || 'Sarah Jenkins';
  const customerEmail = session?.customerEmail || 'sarah.j@example.com';
  const refundAmount = session?.refundAmount || 89.99;

  const verificationUrl = `${window.location.origin}/verify/${token}`;

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    if (type === 'token') {
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    } else {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-appBg flex flex-col">
      <MerchantHeader
        title="Verification Ready"
        subtitle="Share code or secure link with your customer"
      />

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 py-8 flex flex-col justify-center">
        <div className="bg-white rounded-3xl border border-appBorder shadow-sm p-6 sm:p-8 space-y-6">
          {/* Success Icon */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 mb-4 ring-8 ring-emerald-50">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h1 className="text-2xl font-bold text-darkNeutral">Session Link Generated</h1>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Your customer can now submit camera-first evidence without creating an account or logging in.
            </p>
          </div>

          {/* Quick Summary Card */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 flex items-center justify-between text-xs">
            <div>
              <span className="text-[11px] font-semibold text-slate-400 block uppercase">Order ID</span>
              <span className="font-bold text-slate-800 text-sm">{orderId}</span>
            </div>
            <div className="text-center">
              <span className="text-[11px] font-semibold text-slate-400 block uppercase">Customer</span>
              <span className="font-semibold text-slate-700">{customerName}</span>
            </div>
            <div className="text-right">
              <span className="text-[11px] font-semibold text-slate-400 block uppercase">Refund Amount</span>
              <span className="font-bold text-emerald-600 text-sm">{formatCurrency(refundAmount)}</span>
            </div>
          </div>

          {/* Verification Code Box */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">
              Verification Code (Short Code)
            </label>
            <div className="flex items-center gap-2 bg-primary/5 p-3.5 rounded-2xl border border-primary/20">
              <div className="flex-1 font-mono text-lg font-extrabold tracking-wider text-primary text-center sm:text-left">
                {token}
              </div>
              <button
                onClick={() => copyToClipboard(token, 'token')}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-primary border border-primary/20 rounded-xl text-xs font-bold shadow-xs transition-colors"
              >
                {copiedToken ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Code</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Direct Link Box */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">
              Secure Direct Verification Link
            </label>
            <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
              <input
                type="text"
                readOnly
                value={verificationUrl}
                className="flex-1 bg-transparent text-xs font-mono text-slate-600 px-2 select-all focus:outline-none truncate"
              />
              <button
                onClick={() => copyToClipboard(verificationUrl, 'link')}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-primary text-white hover:bg-primary/90 rounded-xl text-xs font-bold shadow-xs transition-colors shrink-0"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* QR Code preview simulation */}
          <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200/80 flex items-center gap-4">
            <div className="w-16 h-16 bg-white p-2 rounded-xl border border-slate-200 flex items-center justify-center shadow-xs shrink-0">
              <QrCode className="w-12 h-12 text-slate-700" />
            </div>
            <div className="flex-1 text-xs text-slate-600">
              <span className="font-bold text-darkNeutral block">Mobile Camera Scan</span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Customer can scan this QR code directly with any smartphone camera to launch the evidence submission runner immediately.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            <button
              onClick={() => window.open(verificationUrl, '_blank')}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
            >
              <span>Open Customer Verification Flow</span>
              <ExternalLink className="w-4 h-4" />
            </button>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => navigate('/create-verification')}
                className="py-2.5 px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors text-center"
              >
                Create Another
              </button>
              <button
                onClick={() => navigate('/dashboard')}
                className="py-2.5 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-800 transition-colors text-center"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
