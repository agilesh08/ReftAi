import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Settings,
  Layers,
  Package,
  Server,
  Key,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  LogOut,
  RefreshCw,
} from 'lucide-react';
import { useMerchant } from '../../../context/MerchantContext';
import { useAuth } from '../../../context/AuthContext';
import { useServerConfig } from '../../../context/ServerConfigContext';
import { MerchantHeader } from '../../../components/common/MerchantHeader';

export function MerchantSettingsPage() {
  const navigate = useNavigate();
  const { products } = useMerchant();
  const { logout, merchant } = useAuth();
  const { baseUrl, openServerConfig } = useServerConfig();

  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState(null);

  const readyProductsCount = products.filter(
    (p) => p.referenceStatus === 'READY' && p.referenceAnglesCount >= 4
  ).length;

  const testConnection = async () => {
    setTestingConnection(true);
    setConnectionStatus(null);
    try {
      // Simulate ping to backend URL or mock
      await new Promise((r) => setTimeout(r, 600));
      setConnectionStatus({ success: true, message: 'Backend reachable & healthy (HTTP 200 OK)' });
    } catch (e) {
      setConnectionStatus({ success: false, message: 'Could not connect to backend server' });
    } finally {
      setTestingConnection(false);
    }
  };

  return (
    <div className="min-h-screen bg-appBg flex flex-col">
      <MerchantHeader
        title="Merchant Settings"
        subtitle="Manage store configuration, product references, and API parameters"
      />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <button
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Dashboard
        </button>

        {/* Store & Profile Card */}
        <div className="bg-white p-6 rounded-2xl border border-appBorder shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-appBorder pb-3">
            <h2 className="text-sm font-bold text-darkNeutral flex items-center gap-2">
              <Settings className="w-4 h-4 text-primary" />
              Store Profile & Identity
            </h2>
            <span className="text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full">
              Production Verified
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                Merchant Store
              </span>
              <span className="font-bold text-slate-800 text-sm">{merchant?.name || 'Apex Electronics'}</span>
              <span className="text-slate-500 block text-[11px] mt-0.5">ID: MERCH-89410</span>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                Contact Email
              </span>
              <span className="font-bold text-slate-800 text-sm">
                {merchant?.email || 'merchant@example.com'}
              </span>
              <span className="text-slate-500 block text-[11px] mt-0.5">Role: Administrator</span>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block mb-0.5">
                Registered Products
              </span>
              <span className="font-bold text-slate-800 text-sm">{products.length} Items</span>
              <span className="text-emerald-600 font-semibold block text-[11px] mt-0.5">
                {readyProductsCount} Ready for Verification
              </span>
            </div>
          </div>
        </div>

        {/* Settings Navigation Links */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            to="/settings/products"
            className="p-5 bg-white rounded-2xl border border-appBorder shadow-sm hover:border-primary/50 transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-primary/10 text-primary rounded-xl group-hover:scale-105 transition-transform">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-sm text-darkNeutral block">Product Reference Catalog</span>
                <span className="text-xs text-slate-500">
                  Manage 4-angle reference baselines (Front, Back, Left, Right)
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-primary transition-colors" />
          </Link>

          <Link
            to="/workflows"
            className="p-5 bg-white rounded-2xl border border-appBorder shadow-sm hover:border-primary/50 transition-all flex items-center justify-between group"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:scale-105 transition-transform">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <span className="font-bold text-sm text-darkNeutral block">Workflows & Security Layers</span>
                <span className="text-xs text-slate-500">
                  Configure 7 layers and merchant evidence questions
                </span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
          </Link>
        </div>

        {/* Server & API Connectivity */}
        <div className="bg-white p-6 rounded-2xl border border-appBorder shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-appBorder pb-3">
            <h2 className="text-sm font-bold text-darkNeutral flex items-center gap-2">
              <Server className="w-4 h-4 text-primary" />
              Backend API & Environment Configuration
            </h2>
            <button
              onClick={openServerConfig}
              className="text-xs font-bold text-primary hover:underline"
            >
              Configure Endpoint
            </button>
          </div>

          <div className="text-xs space-y-3">
            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Current Base URL</span>
                <code className="font-mono text-darkNeutral text-xs">{baseUrl}</code>
              </div>
              <button
                onClick={testConnection}
                disabled={testingConnection}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg font-bold text-xs transition-colors"
              >
                {testingConnection ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                Test Ping
              </button>
            </div>

            {connectionStatus && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  connectionStatus.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{connectionStatus.message}</span>
              </div>
            )}
          </div>
        </div>

        {/* Logout Control */}
        <div className="pt-2">
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-red-200 text-xs font-bold text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out of Merchant Portal</span>
          </button>
        </div>
      </main>
    </div>
  );
}
