import type { ReactElement } from 'react';

interface RegenerateButtonProps {
  readonly onRegenerate: () => void;
}

/**
 * Bottom-centre ↻ button. Notifies the parent to generate a new garden.
 * Seed creation and URL hash write are handled by the parent route.
 */
export function RegenerateButton({ onRegenerate }: RegenerateButtonProps): ReactElement {
  function handleClick() {
    onRegenerate();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label="Generate new garden"
      className="fixed bottom-[max(24px,env(safe-area-inset-bottom,24px))] left-1/2 -translate-x-1/2 z-10 flex items-center justify-center w-11 h-11 rounded-full border border-[var(--border)] bg-transparent text-[var(--muted)] transition-colors hover:text-[var(--text)]"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width="20"
        height="20"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d="M20 12a8 8 0 1 1-3-6.3" />
        <path d="M20 4v4h-4" />
      </svg>
    </button>
  );
}
