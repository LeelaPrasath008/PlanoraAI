import React, { useId } from 'react';
import { User } from 'firebase/auth';
import {
  Sparkles,
  Search,
  X,
  Plus,
  RotateCcw,
  LogIn,
  LogOut,
  Cloud,
} from 'lucide-react';
import { ToastNotice } from '../../hooks/useToast';

export type ActiveSection =
  | 'portfolio'
  | 'overview'
  | 'budget'
  | 'timeline'
  | 'vendors'
  | 'scenarios'
  | 'export';

export interface AppHeaderProps {
  viewMode: 'landing' | 'workspace';
  activeSection: ActiveSection;
  onNavigateSection: (section: ActiveSection) => void;
  onSetViewMode: (mode: 'landing' | 'workspace') => void;
  searchQuery: string;
  onSetSearchQuery: (q: string) => void;
  onOpenGeneratorModal: () => void;
  onResetDemoData: () => void;
  currentUser: User | null;
  isSyncingCloud: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
  toastNotice: ToastNotice | null;
  onDismissToast: () => void;
}

/**
 * Top navigation header bar, global search input with linked `<label>`,
 * Google Cloud Auth controls, and status/alert toast banner.
 */
export const AppHeader: React.FC<AppHeaderProps> = ({
  viewMode,
  activeSection,
  onNavigateSection,
  onSetViewMode,
  searchQuery,
  onSetSearchQuery,
  onOpenGeneratorModal,
  onResetDemoData,
  currentUser,
  isSyncingCloud,
  onSignIn,
  onSignOut,
  toastNotice,
  onDismissToast,
}) => {
  const uid = useId();
  const searchInputId = `${uid}-global-search`;

  return (
    <>
      <header className="sticky top-0 z-30 bg-[#FAF7F2]/90 backdrop-blur-md border-b border-[#E6DFD3]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => onSetViewMode('landing')}
              className="flex items-center gap-2.5 text-left group min-h-[38px]"
            >
              <div
                aria-hidden="true"
                className="w-9 h-9 rounded-xl bg-[#1F1C18] text-[#FAF7F2] flex items-center justify-center shadow-xs group-hover:bg-[#B8860B] transition-colors"
              >
                <Sparkles className="w-4 h-4 text-[#B8860B] group-hover:text-white transition-colors" />
              </div>
              <div>
                <span className="font-serif text-xl font-bold tracking-tight text-[#1F1C18] block leading-none">
                  Planora AI
                </span>
                <span className="text-xs font-mono uppercase tracking-widest text-[#6E655A] block mt-0.5">
                  Event &amp; Budget Studio
                </span>
              </div>
            </button>

            <nav
              aria-label="Primary workspace navigation"
              className="hidden md:flex items-center gap-1 bg-[#F3EFE6] p-1 rounded-xl border border-[#E6DFD3]"
            >
              <button
                type="button"
                aria-current={viewMode === 'landing' ? 'page' : undefined}
                onClick={() => onSetViewMode('landing')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-[32px] ${
                  viewMode === 'landing'
                    ? 'bg-white text-[#1F1C18] shadow-2xs'
                    : 'text-[#6E655A] hover:text-[#1F1C18]'
                }`}
              >
                Home Showcase
              </button>
              <button
                type="button"
                aria-current={
                  viewMode === 'workspace' && activeSection !== 'portfolio'
                    ? 'page'
                    : undefined
                }
                onClick={() => {
                  onSetViewMode('workspace');
                  if (activeSection === 'portfolio') {
                    onNavigateSection('overview');
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-[32px] ${
                  viewMode === 'workspace' && activeSection !== 'portfolio'
                    ? 'bg-white text-[#1F1C18] shadow-2xs'
                    : 'text-[#6E655A] hover:text-[#1F1C18]'
                }`}
              >
                Active Event Workspace
              </button>
              <button
                type="button"
                aria-current={
                  viewMode === 'workspace' && activeSection === 'portfolio'
                    ? 'page'
                    : undefined
                }
                onClick={() => {
                  onSetViewMode('workspace');
                  onNavigateSection('portfolio');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all min-h-[32px] ${
                  viewMode === 'workspace' && activeSection === 'portfolio'
                    ? 'bg-white text-[#1F1C18] shadow-2xs'
                    : 'text-[#6E655A] hover:text-[#1F1C18]'
                }`}
              >
                Event Portfolio
              </button>
            </nav>
          </div>

          <div className="flex items-center gap-2.5">
            {viewMode === 'workspace' && (
              <div className="relative hidden lg:block w-64">
                <Search
                  aria-hidden="true"
                  className="w-3.5 h-3.5 text-[#6E655A] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                />
                <label htmlFor={searchInputId} className="sr-only">
                  Search tasks, vendors, and budget items
                </label>
                <input
                  id={searchInputId}
                  type="search"
                  value={searchQuery}
                  onChange={(e) => onSetSearchQuery(e.target.value)}
                  placeholder="Search tasks, vendors, budget..."
                  className="w-full pl-8 pr-7 py-1.5 rounded-xl bg-white border border-[#E6DFD3] text-xs text-[#1F1C18] focus:outline-none focus:border-[#22D3EE]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    aria-label="Clear search query"
                    onClick={() => onSetSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6E655A] hover:text-[#1F1C18]"
                  >
                    <X className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={onOpenGeneratorModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1F1C18] text-[#FAF7F2] text-xs font-semibold hover:bg-[#332E28] transition-colors shadow-2xs min-h-[36px]"
            >
              <Plus className="w-3.5 h-3.5 text-[#B8860B]" aria-hidden="true" />
              <span>New AI Event Plan</span>
            </button>

            <button
              type="button"
              onClick={onResetDemoData}
              aria-label="Reset sample blueprints"
              className="p-2 rounded-xl bg-white border border-[#E6DFD3] text-[#6E655A] hover:text-[#1F1C18] hover:bg-[#F3EFE6] transition-colors min-w-[36px] min-h-[36px] flex items-center justify-center"
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
            </button>

            {currentUser ? (
              <div className="flex items-center gap-2 pl-2 border-l border-[#E6DFD3]">
                <span className="hidden xl:inline-flex items-center gap-1.5 text-xs font-mono text-[#34D399] bg-[#2E5A44]/10 px-2.5 py-1 rounded-lg">
                  <Cloud className="w-3.5 h-3.5" aria-hidden="true" />
                  {isSyncingCloud ? 'Syncing...' : 'Cloud Synced'}
                </span>
                <button
                  type="button"
                  onClick={onSignOut}
                  aria-label="Sign out of Google Cloud Sync"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#E6DFD3] text-xs font-semibold text-[#1F1C18] hover:bg-[#F3EFE6] transition-colors min-h-[36px]"
                >
                  <LogOut className="w-3.5 h-3.5 text-[#6E655A]" aria-hidden="true" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onSignIn}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#E6DFD3] text-xs font-semibold text-[#1F1C18] hover:border-[#B8860B] transition-colors min-h-[36px]"
              >
                <LogIn className="w-3.5 h-3.5 text-[#B8860B]" aria-hidden="true" />
                <span className="hidden sm:inline">Cloud Sync</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {toastNotice && (
        <div
          role={toastNotice.tone === 'warning' ? 'alert' : 'status'}
          className={`border-b px-4 py-2 text-xs transition-colors ${
            toastNotice.tone === 'warning'
              ? 'bg-[#D97706]/15 border-[#D97706]/30 text-[#FBBF24]'
              : 'bg-[#2E5A44] border-[#2E5A44] text-white'
          }`}
        >
          <div className="max-w-[1440px] mx-auto flex items-center justify-between gap-4">
            <span className="font-medium flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
              {toastNotice.message}
            </span>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={onDismissToast}
              className="opacity-80 hover:opacity-100 p-1"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
