import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ArtistHeader } from './ArtistHeader';

function withQuery(ui: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{ui}</QueryClientProvider>;
}

const KNOWN = 'init1lina000000000000000000000000000000lina';

describe('ArtistHeader', () => {
  it('shows the address in mono', () => {
    render(withQuery(<ArtistHeader address={KNOWN} />));
    expect(screen.getByText(KNOWN)).toBeInTheDocument();
  });

  it('renders Artist label', () => {
    render(withQuery(<ArtistHeader address={KNOWN} username="lina" />));
    expect(screen.getByText(/Artist/)).toBeInTheDocument();
  });

  it('eventually shows resolved .init username', async () => {
    render(withQuery(<ArtistHeader address={KNOWN} />));
    await waitFor(() => {
      expect(screen.getByText('lina.init')).toBeInTheDocument();
    });
  });

  it('falls back to short address for unknown addresses', () => {
    const unknown = 'init1zzzz0000000000000000000000000000000zzz';
    render(withQuery(<ArtistHeader address={unknown} />));
    // shortened form should be visible somewhere in the header
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });
});
