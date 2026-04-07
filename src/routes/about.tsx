import { createRoute } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { rootRoute } from './root';

function AboutPage(): ReactElement {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen [padding:var(--space-2xl)_24px_var(--space-xl)]">
      <div className="w-full max-w-[640px]">
        <h1 className="font-light text-2xl [letter-spacing:0.15em] [color:var(--muted)] mt-0 [margin-bottom:var(--space-xl)] text-center">
          Hunting for Carrots
        </h1>

        <div className="font-normal text-base leading-[1.6] [color:var(--text)] text-center">
          <p className="[margin:0_0_var(--space-lg)]">
            A generative zen garden and a collection of reflective tools. Each visit creates a
            unique garden and haiku. No accounts, no tracking, no data collected. Just a quiet
            space. The timer uses real recordings; the bell sounds were donated by a Zen monk. The
            name is deliberate. There are no carrots here.
          </p>

          <p className="[margin:0_0_var(--space-lg)]">
            The garden follows the rules of karesansui. Stones are placed in odd-numbered groups
            with asymmetric arrangements. Raked sand flows in concentric rings around each group and
            parallel lines across open ground. At least forty percent of every composition is empty
            space. It is not absence but presence. Each garden is generated from a seed in the URL.
            The same link always produces the same arrangement. After eight in the evening, the
            garden shifts to dusk.
          </p>

          <p className="m-0">
            Each haiku is assembled from hand-written line fragments: three banks of five-, seven-,
            and five-syllable lines. The selection is weighted toward the current season, though any
            line can appear at any time. Lines are filtered for semantic coherence. A fragment about
            stone is more likely to pair with one about stillness than one about water. The third
            line always carries a pivot: a shift in scale, a turn toward absence, a question left
            open.
          </p>
        </div>

        <footer className="[margin-top:var(--space-xl)] text-[13px] [color:var(--muted)] text-center">
          <a
            href="https://faffweasel.com"
            className="no-underline hover:underline [color:var(--interactive)]"
          >
            Faffweasel Industries
          </a>
        </footer>
      </div>
    </main>
  );
}

export const aboutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/about',
  component: AboutPage,
});
