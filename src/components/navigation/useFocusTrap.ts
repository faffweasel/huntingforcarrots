import { type RefObject, useEffect, useRef } from 'react';

// Elements that participate in the natural tab order.
const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'a[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
}

/**
 * Traps keyboard focus within `containerRef` while `isActive` is true.
 *
 * On activate:  saves the previously focused element and moves focus to
 *               the first focusable element inside the container.
 * While active: Tab wraps from last to first; Shift+Tab wraps from first to last.
 *               Escape calls `onEscape` if provided.
 * On deactivate: restores focus to the element that was active before activation.
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  isActive: boolean,
  onEscape?: () => void
): void {
  const previousFocusRef = useRef<Element | null>(null);

  // Save focus on activate; restore on deactivate.
  useEffect(() => {
    if (isActive) {
      previousFocusRef.current = document.activeElement;
      if (containerRef.current) {
        getFocusable(containerRef.current)[0]?.focus();
      }
    } else {
      if (previousFocusRef.current instanceof HTMLElement) {
        previousFocusRef.current.focus();
      }
    }
  }, [isActive, containerRef]);

  // Tab trap + Escape handling.
  useEffect(() => {
    if (!isActive || !containerRef.current) return;
    const container = containerRef.current;

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape' && onEscape) {
        e.preventDefault();
        onEscape();
        return;
      }

      if (e.key !== 'Tab') return;

      const focusable = getFocusable(container);
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [isActive, containerRef, onEscape]);
}
