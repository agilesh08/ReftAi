import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, Mail, Lock, ArrowRight, Eye, EyeOff, AlertCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, loading, error, clearError } = useAuth();
  const [email, setEmail] = useState('merchant@example.com');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);
    clearError?.();

    if (!email.trim() || !password.trim()) {
      setLocalError('Please enter both email and password');
      return;
    }

    try {
      const success = await login(email, password);
      if (success) {
        navigate('/dashboard');
      }
    } catch (err) {
      setLocalError(err.message || 'Login failed');
    }
  };

  const handleDemoFill = () => {
    setEmail('merchant@example.com');
    setPassword('password123');
    setLocalError(null);
  };

  return (
    <div className="min-h-screen bg-appBg flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        {/* Top Back Link */}
        <div className="mb-4">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Gateway
          </Link>
        </div>

        {/* Brand Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 shadow-sm mb-3">
            <img
              src="/assets/branding/reft_icon.png"
              alt="Reft.AI Icon"
              className="w-9 h-9 object-contain"
            />
          </div>
          <h2 className="text-2xl font-bold text-darkNeutral tracking-tight">Merchant Portal</h2>
          <p className="mt-1 text-xs text-slate-500">
            Sign in to manage refund verifications and evaluate evidence
          </p>
        </div>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-sm border border-appBorder rounded-2xl sm:px-10">
          {(localError || error) && (
            <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span className="text-xs text-red-700 leading-snug">{localError || error}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Merchant Email
              </label>
              <div className="relative rounded-xl shadow-none">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-darkNeutral placeholder-slate-400"
                  placeholder="merchant@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Password
                </label>
                <button
                  type="button"
                  onClick={handleDemoFill}
                  className="text-[11px] font-medium text-primary hover:underline"
                >
                  Use Demo Credentials
                </button>
              </div>
              <div className="relative rounded-xl shadow-none">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-darkNeutral placeholder-slate-400"
                  placeholder="••••••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-semibold text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all disabled:opacity-60 cursor-pointer"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick Demo Help Box */}
          <div className="mt-6 pt-5 border-t border-slate-100 bg-slate-50/70 p-3 rounded-xl border border-slate-200/60">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-700 mb-1">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              Demo Credentials
            </div>
            <p className="text-[11px] text-slate-500 mb-2">
              Sign in with mock credentials to test all merchant verification and investigation workflows.
            </p>
            <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-600 bg-white p-2 rounded-lg border border-slate-200">
              <div>
                <span className="text-slate-400 block text-[9px] font-sans uppercase">Email</span>
                merchant@example.com
              </div>
              <div>
                <span className="text-slate-400 block text-[9px] font-sans uppercase">Password</span>
                password123
              </div>
            </div>
          </div>
        </div>

        {/* Customer Link Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-slate-500">
            Are you a customer verifying a refund?{' '}
            <Link to="/" className="font-semibold text-primary hover:underline">
              Enter Verification Code
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
