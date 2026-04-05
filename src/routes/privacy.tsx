import { createRoute } from '@tanstack/react-router';
import type { ReactElement } from 'react';
import { useEffect } from 'react';
import { rootRoute } from './root';

function PrivacyPage(): ReactElement {
  useEffect(() => {
    document.title = 'Privacy, Zen Garden';
  }, []);

  return (
    <main className="flex flex-col items-center justify-center min-h-screen [padding:var(--space-2xl)_24px_var(--space-xl)]">
      <div className="w-full max-w-[640px]">
        <h1 className="font-light text-2xl [letter-spacing:0.15em] [color:var(--muted)] mt-0 [margin-bottom:var(--space-xl)] text-center">
          Privacy
        </h1>

        <div className="font-normal text-base leading-[1.6] [color:var(--text)] text-left">
          <p className="[margin:0_0_var(--space-lg)]">
            This site is operated by Faffweasel Industries, a one-person software operation based in
            the United Kingdom.
          </p>

          <p className="[margin:0_0_var(--space-lg)]">
            <strong className="font-medium">What we collect:</strong> Nothing. These tools run
            entirely in your browser. No data is sent to any server, no accounts are required, and
            no analytics or tracking of any kind is used.
          </p>

          <p className="[margin:0_0_var(--space-lg)]">
            <strong className="font-medium">Cookies:</strong> None. These tools do not set cookies.
          </p>

          <p className="[margin:0_0_var(--space-lg)]">
            <strong className="font-medium">Local storage:</strong> Some tools store data in your
            browser's local storage so your results survive a page refresh. This data never leaves
            your browser. You can clear it at any time through your browser settings.
          </p>

          <p className="[margin:0_0_var(--space-lg)]">
            <strong className="font-medium">Shared links:</strong> Some tools let you share your
            results via a link. Your results are encoded in the URL itself. Anyone with that link
            can see the results. No data is stored on our servers when you share a link.
          </p>

          <p className="[margin:0_0_var(--space-lg)]">
            <strong className="font-medium">Hosting:</strong> These sites are hosted on Bunny.net, a
            European CDN. Their servers process your IP address to deliver the pages to you. We do
            not have access to those logs. Bunny.net's own privacy policy applies to their
            infrastructure.
          </p>

          <p className="[margin:0_0_var(--space-lg)]">
            <strong className="font-medium">Third-party resources:</strong> None. No external fonts,
            scripts, analytics, or tracking pixels are loaded. Everything is served from our own
            domain.
          </p>

          <p className="[margin:0_0_var(--space-lg)]">
            <strong className="font-medium">Your rights:</strong> Under UK GDPR, you have the right
            to access, correct, or delete any personal data we hold about you. Since we hold no
            personal data, there is nothing to access, correct, or delete.
          </p>

          <p className="[margin:0_0_var(--space-lg)]">
            <strong className="font-medium">Changes:</strong> If this policy changes, the updated
            version will be posted here. Since we currently collect nothing, any change would mean
            we've started collecting something, and this page will say exactly what and why.
          </p>

          <h2 className="font-light text-xl [letter-spacing:0.12em] [color:var(--muted)] [margin:var(--space-xl)_0_var(--space-md)]">
            Disclaimer
          </h2>

          <p className="m-0">
            These tools are provided free of charge, as-is, with no warranty. They are not
            professional advice. We are not responsible for decisions made based on their output, or
            for any data loss resulting from their use. Always keep backups of your files.
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

export const privacyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/privacy',
  component: PrivacyPage,
});
