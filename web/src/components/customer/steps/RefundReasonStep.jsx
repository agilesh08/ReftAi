import React from 'react';
import { Check } from 'lucide-react';
import { useCustomerFlow } from '../../../context/CustomerFlowContext';

const DEFAULT_OPTIONS = [
  { value: 'Damaged on arrival', label: 'Product arrived damaged or shattered' },
  { value: 'Defective / Not functioning', label: 'Item is defective or does not power on' },
  { value: 'Wrong item received', label: 'Received wrong product or incorrect variant' },
  { value: 'Missing parts or accessories', label: 'Missing parts, cables, or accessories' },
  { value: 'Counterfeit / Authenticity doubt', label: 'Authenticity doubt or packaging mismatch' },
];

export function RefundReasonStep() {
  const { reason, setReason, notes, setNotes } = useCustomerFlow();

  return (
    <div className="space-y-4">
      <div className="border-b border-appBorder pb-2">
        <h2 className="text-sm font-bold text-darkNeutral">1. State Primary Defect / Reason</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Select the option that best reflects the condition of the merchandise upon delivery:
        </p>
      </div>

      <div className="space-y-2">
        {DEFAULT_OPTIONS.map((opt) => {
          const isSelected = reason === opt.value;
          return (
            <div
              key={opt.value}
              onClick={() => setReason(opt.value)}
              className={`p-3.5 rounded-xl border text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center justify-between ${
                isSelected
                  ? 'bg-primary/10 border-primary text-primary shadow-xs'
                  : 'bg-white border-slate-200 hover:border-primary/40 text-darkNeutral'
              }`}
            >
              <span>{opt.label}</span>
              {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
            </div>
          );
        })}
      </div>

      <div className="pt-2">
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          Detailed Statement or Description
        </label>
        <textarea
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Describe how and when the issue was discovered (e.g., crack on bottom bezel upon opening sealed packaging)..."
          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-darkNeutral focus:outline-none focus:ring-2 focus:ring-primary transition-all"
        />
      </div>
    </div>
  );
}
