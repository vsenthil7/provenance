import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CollectionGrid } from './CollectionGrid';
import type { Collection } from '@/lib/api/types';

const C = (n: number, over: Partial<Collection> = {}): Collection => ({
  id: String(n),
  object_addr: `init1col${n}`,
  name: `Collection ${n}`,
  symbol: `C${n}`,
  artist_addr: 'init1artist',
  default_royalty_bps: 500,
  minted: 2,
  supply_cap: 10,
  metadata_uri: 'ipfs://x',
  frozen: false,
  created_at: '2026-04-01T00:00:00Z',
  ...over,
});

describe('CollectionGrid', () => {
  it('renders EmptyState when empty', () => {
    render(<CollectionGrid collections={[]} />);
    expect(screen.getByText('No collections yet')).toBeInTheDocument();
  });

  it('renders one card per collection with correct link', () => {
    render(<CollectionGrid collections={[C(1), C(2)]} />);
    const links = screen.getAllByRole('link');
    expect(links[0]).toHaveAttribute('href', '/collection/1');
    expect(links[1]).toHaveAttribute('href', '/collection/2');
  });

  it('shows minted/cap', () => {
    render(<CollectionGrid collections={[C(1, { minted: 3, supply_cap: 100 })]} />);
    expect(screen.getByText(/3 \/ 100 minted/)).toBeInTheDocument();
  });

  it('omits cap when open edition', () => {
    render(<CollectionGrid collections={[C(1, { minted: 5, supply_cap: null })]} />);
    expect(screen.getByText(/5\s+minted/)).toBeInTheDocument();
  });

  it('shows royalty as percentage', () => {
    render(<CollectionGrid collections={[C(1, { default_royalty_bps: 1000 })]} />);
    expect(screen.getByText(/10\.0%/)).toBeInTheDocument();
  });
});
