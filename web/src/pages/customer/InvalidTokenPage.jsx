import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, ShieldAlert } from 'lucide-react';

export function InvalidTokenPage() {
  const navigate = useNavigate();
  const { token } = useParams();

  return (
    <div className="min-h-screen bg-appBg flex flex-col justify-center items-center p-4">
      <div className="bg-white p-8 rounded-3xl border border-appBorder shadow-sm text-center max-w-md w-full space-y-5">
        <div className="w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-1">
          <h1 className="text-xl font-bold text-darkNeutral">Invalid Verification Link</h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            The verification session code you provided is invalid, has expired, or has already been removed by the merchant.
          </p>
        </div>

        {token && (
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 font-mono text-xs text-slate-600">
            Provided Token: <strong>{token}</strong>
          </div>
        )}

        <div className="pt-2">
          <button
            onClick={() => navigate('/')}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-primary text-white hover:bg-primary/90 rounded-xl text-xs font-bold transition-all shadow-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Enter Valid Code</span>
          </button>
        </div>
      </div>
    </div>
  );
}
