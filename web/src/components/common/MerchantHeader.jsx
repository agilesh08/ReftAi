import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Settings, 
  RefreshCw, 
  LogOut, 
  Menu, 
  X, 
  Package, 
  GitFork, 
  PlusCircle, 
  LayoutDashboard,
  Server
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useServerConfig } from '../../context/ServerConfigContext';
import { useMerchant } from '../../context/MerchantContext';

export function MerchantHeader({ title = 'Merchant Portal', showNav = true, onRefresh }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const { openServerConfig } = useServerConfig();
  const { refreshData } = useMerchant();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    } else {
      refreshData();
    }
  };

  const handleSignOut = () => {
    logout();
    navigate('/');
  };

  const navLinks = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'New Session', path: '/create-verification', icon: PlusCircle },
    { label: 'Products & References', path: '/settings/products', icon: Package },
    { label: 'Workflow Builder', path: '/workflows', icon: GitFork },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-appBorder shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand / Logo */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Link to="/dashboard" className="flex items-center group py-1">
            <img
              src="/assets/branding/reft_wordmark.png"
              alt="Reft.AI"
              className="h-7 w-auto object-contain transition-opacity group-hover:opacity-90"
            />
          </Link>
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 hidden md:inline-flex items-center">
            Merchant
          </span>
        </div>

        {/* Desktop Navigation */}
        {showNav && (
          <nav className="hidden lg:flex items-center gap-1.5 xl:gap-2">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive =
                location.pathname === item.path ||
                (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs xl:text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-primary text-white shadow-xs'
                      : 'text-darkNeutral hover:bg-slate-100 hover:text-primary'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="whitespace-nowrap">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={openServerConfig}
            title="API Server Configuration"
            className="w-9 h-9 inline-flex items-center justify-center text-darkNeutral hover:text-primary hover:bg-slate-100 rounded-xl transition-colors border border-transparent hover:border-slate-200"
          >
            <Server className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleRefresh}
            title="Refresh Data"
            className="w-9 h-9 inline-flex items-center justify-center text-darkNeutral hover:text-primary hover:bg-slate-100 rounded-xl transition-colors border border-transparent hover:border-slate-200"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleSignOut}
            title="Sign Out"
            className="h-9 px-3 inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors border border-transparent hover:border-rose-200 hidden sm:inline-flex"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span className="hidden xl:inline">Sign Out</span>
          </button>

          {/* Mobile / Tablet Hamburger Toggle */}
          {showNav && (
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="w-9 h-9 inline-flex items-center justify-center text-darkNeutral hover:bg-slate-100 rounded-xl lg:hidden border border-slate-200"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          )}
        </div>
      </div>

      {/* Mobile / Tablet Menu Dropdown */}
      {mobileMenuOpen && showNav && (
        <div className="lg:hidden border-t border-appBorder bg-white px-4 py-3 shadow-lg space-y-1">
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.path ||
              (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-colors ${
                  isActive
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-darkNeutral hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4.5 h-4.5 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
          <div className="pt-2 border-t border-appBorder">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                handleSignOut();
              }}
              className="flex items-center gap-2.5 w-full px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
            >
              <LogOut className="w-4.5 h-4.5 shrink-0" />
              <span>Sign Out of Portal</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
