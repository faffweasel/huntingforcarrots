import { useState, useEffect } from 'react'
import type { ReactElement } from 'react'
import { createRootRoute, Outlet, useRouterState } from '@tanstack/react-router'
import { MenuTrigger } from '../components/navigation/MenuTrigger'
import { MenuPanel } from '../components/navigation/MenuPanel'
import { menuSections } from '../components/navigation/menu-items'

function RootLayout(): ReactElement {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  // Close on any navigation — covers Link clicks, back/forward, programmatic navigate.
  useEffect(() => {
    setIsOpen(false)
  }, [pathname])

  // Close on Escape. Listener only attached while the panel is open.
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  return (
    <div>
      <MenuTrigger isOpen={isOpen} onClick={() => setIsOpen((v) => !v)} />

      {/* Overlay — catches click-outside. Very subtle wash so the garden reads through.
          z-[15]: above MenuTrigger (z-10) but below MenuPanel (z-20). Only rendered
          while open so it doesn't sit in the DOM as an invisible tap blocker. */}
      {isOpen && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-[15] bg-black/5"
          onClick={() => setIsOpen(false)}
        />
      )}

      <MenuPanel
        sections={menuSections}
        currentPath={pathname}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />

      <Outlet />
    </div>
  )
}

export const rootRoute = createRootRoute({
  component: RootLayout,
})
