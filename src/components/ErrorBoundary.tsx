import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { logClientError } from '../utils/clientLogger';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Top-level React Error Boundary that logs structured errors and renders
 * an accessible recovery card (`role="alert"`).
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logClientError({
      context: 'ErrorBoundary caught unhandled component error',
      error,
      details: { componentStack: errorInfo.componentStack },
    });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      let friendlyMessage =
        'An unexpected error occurred while rendering your event workspace.';
      let details = this.state.error?.message || '';

      try {
        const parsed = JSON.parse(details);
        if (parsed && parsed.operationType) {
          friendlyMessage = `Cloud sync permission or validation error during ${parsed.operationType} on ${parsed.path || 'database'}.`;
          details = parsed.error || details;
        }
      } catch (parseErr) {
        void parseErr;
      }

      return (
        <div
          role="alert"
          className="min-h-screen bg-[#FAF7F2] flex items-center justify-center p-6"
        >
          <div className="max-w-lg w-full bg-white border border-[#E6DFD3] rounded-2xl p-8 shadow-lg space-y-5 text-center">
            <div
              aria-hidden="true"
              className="w-12 h-12 rounded-2xl bg-[#A63A2B]/10 text-[#F87171] flex items-center justify-center mx-auto"
            >
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <h2 className="font-serif text-2xl font-bold text-[#1F1C18]">
                Workspace Recovery Mode
              </h2>
              <p className="text-sm text-[#6E655A] leading-relaxed">
                {friendlyMessage}
              </p>
              {details && (
                <pre className="mt-3 p-3 rounded-xl bg-[#FAF7F2] border border-[#E6DFD3] text-xs font-mono text-[#F87171] text-left overflow-x-auto max-h-36">
                  {details}
                </pre>
              )}
            </div>
            <button
              type="button"
              onClick={this.handleReset}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#1F1C18] text-white text-xs font-semibold hover:bg-[#332E28] transition-colors min-h-[38px]"
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
              Reload Planora Workspace
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
