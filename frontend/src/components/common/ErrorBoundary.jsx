// frontend/src/components/common/ErrorBoundary.jsx
// Error boundary — Stitch "Luminous Archive" OLED design system
// Pure Tailwind, no HeroUI Card/Button dependencies

import { Component } from 'react';
import { LuAlertTriangle as AlertTriangle, LuRefreshCw as RefreshCw } from 'react-icons/lu';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-echo-base p-6">
          {/* Glass error card */}
          <div className="w-full max-w-lg rounded-card border border-white/[0.06] bg-echo-surface px-8 py-10 shadow-2xl">
            {/* Icon */}
            <div className="mb-6 flex justify-center">
              <div className="flex size-16 items-center justify-center rounded-full border border-[#F87171]/20 bg-[#F87171]/[0.08]">
                <AlertTriangle size={28} className="text-[#F87171]" />
              </div>
            </div>

            {/* Title */}
            <div className="mb-6 text-center">
              <h1 className="mb-2 text-xl font-bold tracking-tight text-white">
                Something went wrong
              </h1>
              <p className="text-sm leading-relaxed text-white/50">
                An unexpected error occurred. You can try again or reload the page.
              </p>
            </div>

            {/* Dev-only error details */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-6 max-h-56 overflow-auto rounded-btn border border-white/[0.06] bg-echo-base p-4">
                <p className="mb-2 font-mono text-xs text-[#F87171]">
                  <span className="font-semibold">Error: </span>
                  {this.state.error.toString()}
                </p>
                {this.state.errorInfo && (
                  <details className="cursor-pointer">
                    <summary className="mb-2 text-xs font-semibold text-white/60 hover:text-white/80">
                      Stack trace
                    </summary>
                    <pre className="whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-white/40">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={this.handleReset}
                className="inline-flex items-center gap-2 rounded-btn bg-accent-primary px-5 py-2.5 text-sm font-semibold text-white transition-all duration-150 hover:bg-accent-primary/90"
              >
                <RefreshCw size={15} />
                Try Again
              </button>

              <button
                onClick={this.handleReload}
                className="inline-flex items-center gap-2 rounded-btn border border-white/[0.06] bg-transparent px-5 py-2.5 text-sm font-medium text-white/70 transition-all duration-150 hover:bg-echo-surface-hover hover:text-white"
              >
                Reload Page
              </button>
            </div>

            {/* Footer note */}
            <p className="mt-6 text-center text-xs text-white/30">
              If this keeps happening, please contact support.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
