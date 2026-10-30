import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, User, Key, Lock, ArrowRight, ShieldCheck, Box, Camera, CheckCircle2 } from 'lucide-react';
import { useServerConfig } from '../../context/ServerConfigContext';
import { useAuth } from '../../context/AuthContext';

export function GatewayPage() {
  const navigate = useNavigate();
  const { openServerConfig } = useServerConfig();
  const { isAuthenticated } = useAuth();
  const [tokenInput, setTokenInput] = useState('');
  const [error, setError] = useState(null);

  // If already authenticated as merchant and clicks home, they can quickly resume dashboard
  useEffect(() => {
    // If merchant token exists in query or storage, keep gateway accessible but ready
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    let cleaned = tokenInput.trim();
    if (!cleaned) {
      setError('Please enter a verification code or link');
      return;
    }

    // Extract token if user pasted full URL (e.g., http://.../verify/VR-2026-9041)
    if (cleaned.includes('/verify/')) {
      cleaned = cleaned.split('/verify/')[1].split('?')[0].split('#')[0];
    } else if (cleaned.includes('/v/')) {
      cleaned = cleaned.split('/v/')[1].split('?')[0].split('#')[0];
    }

    if (!cleaned) {
      setError('Invalid verification link format.');
      return;
    }

    navigate(`/verify/${cleaned}`);
  };

  const featurePills = [
    { emoji: '📦', text: 'Order Check' },
    { emoji: '📸', text: 'Photo Proof' },
    { emoji: '✓', text: 'Fast Review' },
  ];

  return (
    <div className="min-h-screen bg-appBg flex flex-col justify-between">
      {/* Top Bar */}
      <header className="bg-white border-b border-appBorder px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <img
            src="/assets/branding/reft_icon.png"
            alt="Reft.AI Logo"
            className="w-8 h-8 object-contain"
          />
          <div>
            <span className="text-base font-extrabold text-primary tracking-tight block leading-tight">
              Reft.AI
            </span>
            <span className="text-[11px] font-medium text-textSecondary">
              Welcome back • Refund Verification
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={openServerConfig}
            title="Server Configuration"
            className="p-2 text-darkNeutral hover:text-primary hover:bg-surface-variant rounded-xl transition-colors"
          >
            <Settings className="w-5 h-5" />
          </button>
          <button
            onClick={() => navigate(isAuthenticated ? '/dashboard' : '/login')}
            title="Merchant Portal"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-darkNeutral hover:text-primary hover:bg-surface-variant rounded-xl border border-appBorder transition-colors"
          >
            <User className="w-4 h-4" />
            <span className="hidden sm:inline">Merchant Portal</span>
          </button>
        </div>
      </header>

      {/* Main Centered Content */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="max-w-[440px] w-full space-y-6">
          {/* Centered Lock Icon Container */}
          <div className="flex justify-center">
            <div className="w-[68px] h-[68px] rounded-full bg-primary-light/35 border-2 border-primary/20 flex items-center justify-center shadow-sm">
              <img
                src="/assets/branding/reft_icon.png"
                alt="Reft.AI"
                className="w-12 h-12 object-contain"
              />
            </div>
          </div>

          {/* Brand & Subtitle */}
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <img
                src="/assets/branding/reft_wordmark.png"
                alt="Reft.AI"
                className="w-44 h-auto object-contain"
              />
            </div>
            <h2 className="text-base font-bold text-primary">Customer Verification</h2>
            <p className="text-xs sm:text-sm text-textSecondary leading-relaxed px-4">
              Securely verify your refund claim with a few simple steps.
            </p>
          </div>

          {/* Feature Pills Row */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {featurePills.map((pill, i) => (
              <div
                key={i}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-variant/80 border border-appBorder text-xs font-semibold text-darkNeutral"
              >
                <span>{pill.emoji}</span>
                <span>{pill.text}</span>
              </div>
            ))}
          </div>

          {/* Card containing verification token entry */}
          <div className="bg-white rounded-2xl border border-appBorder shadow-card p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-darkNeutral">
                <span>🔗</span>
                <span>Enter verification code or link</span>
              </div>

              <div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-textMuted">
                    <Key className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. VR-2026-9041 or paste link"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm border border-appBorder rounded-xl focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary font-mono"
                    value={tokenInput}
                    onChange={(e) => {
                      setTokenInput(e.target.value);
                      if (error) setError(null);
                    }}
                  />
                </div>
                {error && <p className="text-[11px] text-red-600 mt-1.5 font-medium">{error}</p>}
              </div>

              {/* Quick sample session chips */}
              <div className="space-y-1.5">
                <span className="text-[10.5px] text-textSecondary font-semibold">Try sample customer session:</span>
                <div className="flex flex-wrap gap-1.5">
                  {['VR-2026-9041', 'VR-2026-7812', 'VR-2026-2291'].map((sample) => (
                    <button
                      key={sample}
                      type="button"
                      onClick={() => setTokenInput(sample)}
                      className="px-2 py-0.5 text-[10.5px] font-mono font-medium rounded-md bg-surface-variant hover:bg-primary/10 hover:text-primary text-textSecondary border border-appBorder transition-colors"
                    >
                      {sample}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-primary hover:bg-primary-dark text-white text-xs sm:text-sm font-bold rounded-xl shadow-sm transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Merchant Portal Sign In Link */}
          <div className="text-center">
            <button
              onClick={() => navigate(isAuthenticated ? '/dashboard' : '/login')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline py-1 px-2"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Merchant Portal Sign In</span>
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-textSecondary">
        <p>Reft.AI — Intelligent Refund Evidence Verification System</p>
      </footer>
    </div>
  );
}
