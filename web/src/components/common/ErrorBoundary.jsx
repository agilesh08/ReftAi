import React from 'react';
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronUp } from 'lucide-react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false,
    });
  };

  handleGoDashboard = () => {
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-appBg flex items-center justify-center p-4">
          <div className="max-w-lg w-full bg-white rounded-2xl border border-appBorder shadow-sm p-6 sm:p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto text-rose-600">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-base font-bold text-darkNeutral">
                {this.props.fallbackTitle || 'Unable to Load Page'}
              </h2>
              <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                An unexpected error occurred while rendering this view. Your session and data remain safe.
              </p>
            </div>

            {/* Error Message Details */}
            {this.state.error && (
              <div className="text-left bg-slate-50 rounded-xl p-3 border border-slate-200">
                <button
                  type="button"
                  onClick={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
                  className="w-full flex items-center justify-between text-xs font-semibold text-slate-700 hover:text-primary"
                >
                  <span className="truncate pr-2 font-mono text-[11px] text-rose-700">
                    {this.state.error.message || String(this.state.error)}
                  </span>
                  {this.state.showDetails ? (
                    <ChevronUp className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                  )}
                </button>

                {this.state.showDetails && this.state.errorInfo && (
                  <pre className="mt-2 text-[10px] font-mono text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200 overflow-x-auto max-h-48 whitespace-pre-wrap leading-tight">
                    {this.state.error.stack}
                    {'\nComponent Stack:'}
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry
              </button>
              <button
                type="button"
                onClick={this.handleGoDashboard}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                <Home className="w-3.5 h-3.5" />
                Return to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
