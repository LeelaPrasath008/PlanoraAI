import React, { useEffect, useRef } from 'react';

export interface DialogProps {
  /** Controls whether the modal dialog is open. */
  isOpen: boolean;
  /** Callback invoked when the user presses Escape or clicks the backdrop. */
  onClose: () => void;
  /** ID of the heading element that labels the dialog. */
  labelledBy: string;
  /** Optional ID of the element that describes the dialog. */
  describedBy?: string;
  /** Maximum width utility classes for the modal container. */
  maxWidthClassName?: string;
  /** Dialog contents. */
  children: React.ReactNode;
}

const FOCUSABLE_SELECTOR = [
  'a[href]:not([disabled])',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"]):not([disabled])',
].join(', ');

/**
 * Accessible modal Dialog component implementing WAI-ARIA Dialog (Modal) pattern:
 * - role="dialog" and aria-modal="true"
 * - aria-labelledby and optional aria-describedby
 * - Keyboard focus trap (Tab and Shift+Tab wrap inside dialog)
 * - Escape key closes the dialog
 * - Initial focus moves inside the dialog when opened
 * - Focus returns to the triggering element when closed
 * - Sets `inert` on #main-content while open so background elements cannot be reached
 */
export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  labelledBy,
  describedBy,
  maxWidthClassName = 'max-w-3xl',
  children,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.setAttribute('inert', '');
      mainContent.setAttribute('aria-hidden', 'true');
    }

    const focusTimer = window.setTimeout(() => {
      const container = containerRef.current;
      if (!container) return;
      const focusable = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      );
      if (focusable.length > 0) {
        focusable[0].focus();
      } else {
        container.focus();
      }
    }, 10);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }

      if (event.key === 'Tab') {
        const container = containerRef.current;
        if (!container) return;
        const focusable = Array.from(
          container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
        );
        if (focusable.length === 0) {
          event.preventDefault();
          return;
        }
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement as HTMLElement | null;

        if (event.shiftKey) {
          if (!active || active === first || !container.contains(active)) {
            event.preventDefault();
            last.focus();
          }
        } else {
          if (!active || active === last || !container.contains(active)) {
            event.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', handleKeyDown);
      if (mainContent) {
        mainContent.removeAttribute('inert');
        mainContent.removeAttribute('aria-hidden');
      }
      if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
        previousFocusRef.current.focus();
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4 overflow-y-auto"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        tabIndex={-1}
        className={`bg-[#FAF7F2] border border-[#E6DFD3] rounded-2xl w-full ${maxWidthClassName} shadow-2xl overflow-hidden flex flex-col max-h-[92vh] focus:outline-none`}
      >
        {children}
      </div>
    </div>
  );
};
