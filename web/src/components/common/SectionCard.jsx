import React from 'react';
import { AppColors } from '../../constants/appColors';

export function SectionCard({
  title,
  icon: Icon,
  trailing,
  accentColor = AppColors.primary,
  children,
  className = '',
}) {
  return (
    <div className={`bg-white rounded-2xl border border-appBorder shadow-card p-5 mb-4 ${className}`}>
      <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-appBorder-subtle">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${accentColor}18`, color: accentColor }}
            >
              <Icon className="w-4 h-4" />
            </div>
          )}
          <h3 className="text-sm sm:text-base font-bold text-darkNeutral tracking-tight">
            {title}
          </h3>
        </div>
        {trailing && <div className="flex-shrink-0">{trailing}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
}
