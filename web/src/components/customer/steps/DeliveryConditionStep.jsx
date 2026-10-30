import React from 'react';
import { Package, Check } from 'lucide-react';
import { useCustomerFlow } from '../../../context/CustomerFlowContext';

const OPTIONS = [
  { value: 'Shipping package was completely intact', label: 'Outer shipping carton was intact with factory seals' },
  { value: 'Damaged / creased outer box', label: 'Shipping box was visibly crushed, punctured, or dented' },
  { value: 'Tampered carrier security tape', label: 'Carrier security tape appeared cut, broken, or re-taped' },
  { value: 'Delivered in polythene bag', label: 'Delivered in loose flyer / bag without protective box' },
];

export function DeliveryConditionStep() {
  const { packageCondition, setPackageCondition, accessoriesRetained, setAccessoriesRetained } = useCustomerFlow();

  return (
    <div className="space-y-4">
      <div className="border-b border-appBorder pb-2">
        <h2 className="text-sm font-bold text-darkNeutral">3. Shipping Carton & Package Integrity</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Please indicate the outer condition of the shipping package upon delivery:
        </p>
      </div>

      <div className="space-y-2">
        {OPTIONS.map((opt) => {
          const isSelected = packageCondition === opt.value;
          return (
            <div
              key={opt.value}
              onClick={() => setPackageCondition(opt.value)}
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

      <div className="pt-2 border-t border-slate-100">
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={accessoriesRetained}
            onChange={(e) => setAccessoriesRetained(e.target.checked)}
            className="rounded text-primary focus:ring-primary h-4 w-4"
          />
          <span className="text-xs text-slate-700 font-semibold">
            All original packaging materials, cables, and included accessories are retained.
          </span>
        </label>
      </div>
    </div>
  );
}
