import { createRootRoute, Outlet, useRouterState } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { useEffect, useState } from 'react';
import { MenuPanel } from '../components/navigation/MenuPanel';
import { MenuTrigger } from '../components/navigation/MenuTrigger';
import { menuSections } from '../components/navigation/menu-items';
import { Timer } from '../components/timer/Timer';

function RootLayout(): ReactElement {
  const [menuOpen, setMenuOpen] = useState(false);
  const [timerOpen, setTimerOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Close menu on any navigation.
  // biome-ignore lint/correctness/useExhaustiveDependencies: pathname is the trigger — effect runs when route changes
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Unified Escape handler — timer takes priority over menu.
  useEffect(() => {
    if (!menuOpen && !timerOpen) return;
    const handleKeyDown = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return;
      if (timerOpen) {
        setTimerOpen(false);
      } else {
        setMenuOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [menuOpen, timerOpen]);

  return (
    <div className="relative">
      <MenuTrigger isOpen={menuOpen} onClick={() => setMenuOpen((v) => !v)} />

      {menuOpen && (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-[15] bg-black/5"
          onClick={() => setMenuOpen(false)}
        />
      )}

      <MenuPanel
        sections={menuSections}
        currentPath={pathname}
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
      />

      <Outlet />

      <Timer
        isOpen={timerOpen}
        onToggle={() => setTimerOpen((v) => !v)}
        onClose={() => setTimerOpen(false)}
      />
    </div>
  );
}

export const rootRoute = createRootRoute({
  component: RootLayout,
});
