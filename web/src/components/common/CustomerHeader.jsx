import React from 'react';
import { Shield, HelpCircle, Server } from 'lucide-react';
import { useServerConfig } from '../../context/ServerConfigContext';

export function CustomerHeader({ title = 'Refund Claim Verification', subtitle }) {
  const { openServerConfig } = useServerConfig();

  return (
    <header className="bg-white border-b border-appBorder sticky top-0 z-30 shadow-sm">
      <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
            <img
              src="/assets/branding/reft_icon.png"
              alt="Reft.AI"
              className="w-6 h-6 object-contain"
            />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-extrabold text-darkNeutral tracking-tight">
              {title}
            </h1>
            {subtitle ? (
              <p className="text-[11px] text-textSecondary">{subtitle}</p>
            ) : (
              <div className="flex items-center gap-1 text-[11px] text-textSecondary font-medium">
                <Shield className="w-3 h-3 text-assessment-consistent" />
                <span>Protected by Reft.AI Verification</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={openServerConfig}
            title="Configure Server URL"
            className="p-2 text-textSecondary hover:text-primary hover:bg-surface-variant rounded-xl transition-colors"
          >
            <Server className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
