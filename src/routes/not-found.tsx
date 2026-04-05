import { Link } from '@tanstack/react-router';
import { useEffect } from 'react';

export function NotFound() {
  useEffect(() => {
    document.title = 'Nothing here, Zen Garden';
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        paddingTop: 'var(--space-2xl)',
        paddingBottom: 'var(--space-2xl)',
        gap: 'var(--space-md)',
      }}
    >
      <h1
        style={{
          fontWeight: 300,
          fontSize: '24px',
          letterSpacing: '0.15em',
          color: 'var(--muted)',
          margin: 0,
        }}
      >
        Nothing here
      </h1>
      <p style={{ color: 'var(--muted)', fontSize: '14px', margin: 0 }}>
        The page you are viewing does not exist.
      </p>
      <Link
        to="/"
        style={{ color: 'var(--interactive)', fontSize: '14px', marginTop: 'var(--space-md)' }}
      >
        {'\u2190 Back to the garden'}
      </Link>
    </div>
  );
}
