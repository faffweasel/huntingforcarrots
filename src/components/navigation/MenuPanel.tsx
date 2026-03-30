import { useRef } from 'react'
import type { ReactElement } from 'react'
import { Link } from '@tanstack/react-router'
import type { MenuItem, MenuSection } from './menu-items'
import { useFocusTrap } from './useFocusTrap'

interface Props {
  readonly sections: readonly MenuSection[]
  readonly currentPath: string
  readonly isOpen: boolean
  readonly onClose: () => void
}

// Registered route paths — kept in sync with src/routes/route-tree.ts.
// The cast in toRegisteredPath() is safe: guarded by Set.has() before use.
type RegisteredPath = '/' | '/about' | '/methodology'
const REGISTERED_PATHS = new Set<string>(['/', '/about', '/methodology'])

function toRegisteredPath(s: string): RegisteredPath | null {
  return REGISTERED_PATHS.has(s) ? (s as RegisteredPath) : null
}

// External items that point to the current site are treated as internal links
// to avoid a full-page reload. Compares URL origin against window.location.origin.
function resolveInternalPath(item: MenuItem): RegisteredPath | null {
  if (!item.external) return toRegisteredPath(item.href)
  if (!item.href) return null
  try {
    const url = new URL(item.href)
    if (url.origin !== window.location.origin) return null
    return toRegisteredPath(url.pathname)
  } catch {
    return null
  }
}

function isCurrentPage(item: MenuItem, currentPath: string): boolean {
  if (item.status === 'coming-soon') return false
  const internalPath = resolveInternalPath(item)
  return internalPath !== null && internalPath === currentPath
}

// Brand mark: 4 concentric arcs, center (12,12), radii 3.5/5.5/7.5/9.5.
// Open at the bottom (30°–150° gap) to suggest the rake's path.
function RakedCircleMark(): ReactElement {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      fill="none"
    >
      <path d="M 15.03 13.75 A 3.5 3.5 0 1 0 8.97 13.75"  stroke="currentColor" strokeWidth="1"   strokeLinecap="round" />
      <path d="M 16.76 14.75 A 5.5 5.5 0 1 0 7.24 14.75"  stroke="currentColor" strokeWidth="1"   strokeLinecap="round" />
      <path d="M 18.50 15.75 A 7.5 7.5 0 1 0 5.50 15.75"  stroke="currentColor" strokeWidth="1"   strokeLinecap="round" />
      <path d="M 20.23 16.75 A 9.5 9.5 0 1 0 3.77 16.75"  stroke="currentColor" strokeWidth="1"   strokeLinecap="round" />
    </svg>
  )
}

interface NavItemProps {
  readonly item: MenuItem
  readonly currentPath: string
  readonly onClose: () => void
  readonly isFooter: boolean
}

function NavItem({ item, currentPath, onClose, isFooter }: NavItemProps): ReactElement {
  const isCurrent = isCurrentPage(item, currentPath)
  const internalPath = resolveInternalPath(item)

  const sizeClass = isFooter
    ? 'text-[13px]'
    : 'text-[14px] [letter-spacing:0.08em]'

  // Dot indicator occupies fixed width so items stay left-aligned regardless.
  const dot = (
    <span
      aria-hidden="true"
      className="w-4 flex-shrink-0 text-[8px] leading-none [color:var(--interactive)]"
    >
      {isCurrent ? '●' : ''}
    </span>
  )

  if (item.status === 'coming-soon') {
    return (
      <li className="flex items-center">
        <span className="w-4 flex-shrink-0" />
        <span
          aria-disabled="true"
          className={`${sizeClass} flex items-center min-h-[44px] [color:var(--muted)] cursor-default`}
        >
          {item.label}
        </span>
      </li>
    )
  }

  // min-h-[44px] on the link element itself (not the <li>) satisfies the
  // 44×44px touch target requirement without relying on parent padding.
  const linkClass = `${sizeClass} flex items-center min-h-[44px] transition-colors duration-150 ${
    isCurrent
      ? '[color:var(--text)]'
      : '[color:var(--muted)] hover:[color:var(--text)]'
  }`

  if (internalPath !== null) {
    return (
      <li className="flex items-center">
        {dot}
        <Link
          to={internalPath}
          onClick={onClose}
          aria-current={isCurrent ? 'page' : undefined}
          className={linkClass}
        >
          {item.label}
        </Link>
      </li>
    )
  }

  return (
    <li className="flex items-center">
      {dot}
      <a
        href={item.href}
        target="_blank"
        rel="noreferrer"
        onClick={onClose}
        className={linkClass}
      >
        {item.label}
        <span className="sr-only">(opens in new tab)</span>
      </a>
    </li>
  )
}

export function MenuPanel({ sections, currentPath, isOpen, onClose }: Props): ReactElement {
  const navRef = useRef<HTMLElement>(null)
  useFocusTrap(navRef, isOpen)

  return (
    <nav
      ref={navRef}
      id="site-nav-panel"
      aria-label="Site navigation"
      // inert removes all interactive elements from the tab order when closed.
      // Falsy branch uses undefined so the attribute is absent (not false).
      inert={!isOpen || undefined}
      className={[
        'fixed inset-y-0 left-0 z-20 overflow-y-auto',
        // Width: 80vw on mobile (max 320px), fixed 280px on desktop
        'w-[80vw] max-w-[320px] md:w-[280px] md:max-w-none',
        // Slide in from left — reduced-motion rule in index.css zeroes duration
        'transition-transform duration-200 ease-out',
        isOpen ? 'translate-x-0' : '-translate-x-full',
      ].join(' ')}
      style={{
        // Apply transparency to the background only, not the content, so text
        // opacity is unaffected. Uses CSS relative colour syntax (CSS Color L5),
        // supported in all evergreen browsers as of 2024.
        background: 'rgb(from var(--surface) r g b / 0.95)',
        backdropFilter: 'blur(8px)',
      }}
    >
      {/* Close button — top-left of panel, same position as the ☰ trigger */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close site navigation"
        className="absolute top-6 left-6 z-10 flex items-center justify-center w-11 h-11 border-0 bg-transparent cursor-pointer p-0 [color:var(--muted)] hover:[color:var(--text)] transition-colors duration-150"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none">
          <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      {/* Inner content — top padding clears the close button (top:24px + h:44px + gap) */}
      <div className="flex flex-col min-h-full pt-20 px-8 pb-8">

        {/* Header: raked-circle mark beside the wordmark */}
        <header className="flex items-center gap-3 mb-8 [color:var(--muted)]">
          <RakedCircleMark />
          <span className="text-[14px] font-light uppercase [letter-spacing:0.15em] [color:var(--text)] leading-none">
            Hunting for Carrots
          </span>
        </header>

        {/* Navigation sections — 32px gap between sections (--space-lg) */}
        {sections.map((section, sectionIndex) => {
          const isFooterSection = sectionIndex === sections.length - 1
          return (
            <div key={sectionIndex} className={sectionIndex > 0 ? 'mt-8' : ''}>
              {section.heading !== undefined && (
                <p className="text-[11px] font-light uppercase [letter-spacing:0.12em] [color:var(--muted)] mb-3">
                  {section.heading}
                </p>
              )}
              <ul className="list-none p-0 m-0">
                {section.items.map((item) => (
                  <NavItem
                    key={item.label}
                    item={item}
                    currentPath={currentPath}
                    onClose={onClose}
                    isFooter={isFooterSection}
                  />
                ))}
              </ul>
            </div>
          )
        })}

      </div>
    </nav>
  )
}
