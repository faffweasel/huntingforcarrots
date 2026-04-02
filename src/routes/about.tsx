import { createRoute } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { rootRoute } from './root';

function AboutPage(): ReactElement {
  return (
    <main
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        padding: 'var(--space-2xl) 24px var(--space-xl)',
      }}
    >
      <div style={{ maxWidth: 640, width: '100%' }}>
        <h1
          style={{
            fontWeight: 300,
            fontSize: 24,
            letterSpacing: '0.15em',
            color: 'var(--muted)',
            marginTop: 0,
            marginBottom: 'var(--space-xl)',
            textAlign: 'center',
          }}
        >
          Hunting for Carrots
        </h1>

        <div
          style={{
            fontWeight: 400,
            fontSize: 16,
            lineHeight: 1.6,
            color: 'var(--text)',
            textAlign: 'center',
          }}
        >
          <p style={{ margin: '0 0 var(--space-lg)' }}>
            A generative zen garden and a collection of reflective tools. Each visit creates a
            unique garden and haiku. No accounts, no tracking, no data collected. Just a quiet
            space. The timer uses a real recording for the bell. The name is deliberate. There are
            no carrots here.
          </p>

          <p style={{ margin: '0 0 var(--space-lg)' }}>
            The garden follows the rules of karesansui. Stones are placed in odd-numbered groups
            with asymmetric arrangements. Raked sand flows in concentric rings around each group and
            parallel lines across open ground. At least forty percent of every composition is empty
            space. It is not absence but presence. Each garden is generated from a seed in the URL.
            The same link always produces the same arrangement. After eight in the evening, the
            garden shifts to dusk.
          </p>

          <p style={{ margin: 0 }}>
            Each haiku is assembled from hand-written line fragments: three banks of five-, seven-,
            and five-syllable lines. The selection is weighted toward the current season, though any
            line can appear at any time. Lines are filtered for semantic coherence. A fragment about
            stone is more likely to pair with one about stillness than one about water. The third
            line always carries a pivot: a shift in scale, a turn toward absence, a question left
            open.
          </p>
        </div>

        <footer
          style={{
            marginTop: 'var(--space-xl)',
            fontSize: 13,
            color: 'var(--muted)',
            textAlign: 'center',
          }}
        >
          <a
            href="https://faffweasel.com"
            className="no-underline hover:underline"
            style={{ color: 'var(--interactive)' }}
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
