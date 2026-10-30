import React from 'react';
import { CreditCard, Upload, Check, Trash2 } from 'lucide-react';
import { useCustomerFlow } from '../../../context/CustomerFlowContext';

export function PaymentProofStep() {
  const { paymentScreenshot, setPaymentScreenshot } = useCustomerFlow();

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (f) {
      setPaymentScreenshot(f);
    }
  };

  const handleRemove = () => {
    setPaymentScreenshot(null);
  };

  return (
    <div className="space-y-4">
      <div className="border-b border-appBorder pb-2">
        <h2 className="text-sm font-bold text-darkNeutral">4. Purchase & Payment Confirmation</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Attach a payment invoice, UPI transaction screenshot, or delivery slip (optional but speeds up verification):
        </p>
      </div>

      <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2">
        <CreditCard className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <span>
          Payment verification checks order reconciliation without asking for sensitive credentials. 
          <strong> Never provide PINs, CVV, or passwords.</strong>
        </span>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
          Attach Payment Slip / Transaction Screenshot
        </label>

        {paymentScreenshot ? (
          <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center gap-3 truncate">
              <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg shrink-0">
                <Check className="w-4 h-4" />
              </div>
              <div className="truncate text-xs">
                <span className="font-bold text-slate-800 block truncate">{paymentScreenshot.name}</span>
                <span className="text-slate-400 text-[11px]">
                  {(paymentScreenshot.size / 1024).toFixed(1)} KB • Attached
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleRemove}
              className="p-2 text-slate-400 hover:text-red-500 transition-colors"
              title="Remove"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <label className="border-2 border-dashed border-slate-200 hover:border-primary/50 rounded-xl p-5 text-center bg-slate-50/50 hover:bg-primary/5 cursor-pointer block transition-colors">
            <Upload className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
            <span className="text-xs font-bold text-primary block">Click to select screenshot</span>
            <span className="text-[11px] text-slate-400 block mt-0.5">JPG, PNG or PDF (up to 10MB)</span>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        )}
      </div>
    </div>
  );
}
