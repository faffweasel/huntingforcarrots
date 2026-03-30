import type { ReactElement } from 'react'

interface Props {
  readonly isOpen: boolean
  readonly onClick: () => void
}

export function MenuTrigger({ isOpen, onClick }: Props): ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={isOpen ? 'Close site navigation' : 'Open site navigation'}
      aria-expanded={isOpen}
      aria-controls="site-nav-panel"
      className="absolute top-6 left-6 z-10 flex items-center justify-center w-11 h-11 border-0 bg-transparent cursor-pointer p-0 [color:var(--muted)] hover:[color:var(--text)] transition-colors duration-150"
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
      >
        {/* Three horizontal bars — hamburger */}
        <g style={{ opacity: isOpen ? 0 : 1, transition: 'opacity 0.15s ease' }}>
          <line x1="4" y1="7" x2="20" y2="7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="4" y1="17" x2="20" y2="17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </g>
        {/* Two diagonal lines — close × */}
        <g style={{ opacity: isOpen ? 1 : 0, transition: 'opacity 0.15s ease' }}>
          <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </g>
      </svg>
    </button>
  )
}
