import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CollectionHeader } from './CollectionHeader';
import type { Collection } from '@/lib/api/types';

const C: Collection = {
  id: '1',
  object_addr: 'init1col',
  name: 'Quiet Series',
  symbol: 'QS',
  artist_addr: 'init1artist',
  default_royalty_bps: 750,
  minted: 7,
  supply_cap: 25,
  metadata_uri: 'ipfs://x',
  frozen: false,
  created_at: '2026-04-01T00:00:00Z',
};

describe('CollectionHeader', () => {
  it('shows the collection name and symbol', () => {
    render(<CollectionHeader collection={C} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Quiet Series');
    expect(screen.getByText(/QS/)).toBeInTheDocument();
  });

  it('formats royalty as percentage', () => {
    render(<CollectionHeader collection={C} />);
    expect(screen.getByText('7.5%')).toBeInTheDocument();
  });

  it('shows minted/cap', () => {
    render(<CollectionHeader collection={C} />);
    expect(screen.getByText(/7\s+\/\s+25/)).toBeInTheDocument();
  });

  it('shows open edition when no cap', () => {
    render(<CollectionHeader collection={{ ...C, supply_cap: null }} />);
    expect(screen.getByText(/open edition/)).toBeInTheDocument();
  });

  it('shows Frozen state', () => {
    render(<CollectionHeader collection={{ ...C, frozen: true }} />);
    expect(screen.getByText('Frozen')).toBeInTheDocument();
  });

  it('shows Active state when not frozen', () => {
    render(<CollectionHeader collection={C} />);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });
});
