import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ListingDetail } from './ListingDetail';
import type { Listing } from '@/lib/api/types';

const L: Listing = {
  id: '1',
  object_addr: 'init1listing',
  seller_addr: 'init1seller',
  price_uinit: '5000000', // 5 INIT
  expires_at: null,
  status: 'active',
  created_at: '2026-04-01T00:00:00Z',
  artwork: {
    id: '7',
    object_addr: 'init1art',
    collection_id: '1',
    edition_no: 3,
    title: 'Quiet Morning',
    content_hash: '0xabcd',
    image_uri: 'https://r2.example/qm.png',
    metadata_uri: null,
    royalty_bps: 500,
    creator_addr: 'init1artist',
    current_owner: 'init1seller',
    minted_at: '2026-04-01T00:00:00Z',
  },
};

describe('ListingDetail', () => {
  it('renders the artwork title', () => {
    render(<ListingDetail listing={L} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Quiet Morning');
  });

  it('shows price formatted as INIT', () => {
    render(<ListingDetail listing={L} />);
    expect(screen.getByText(/5\s*INIT/)).toBeInTheDocument();
  });

  it('shows royalty percentage', () => {
    render(<ListingDetail listing={L} />);
    expect(screen.getByText('5.0%')).toBeInTheDocument();
  });

  it('shows status', () => {
    render(<ListingDetail listing={{ ...L, status: 'sold' }} />);
    expect(screen.getByText('sold')).toBeInTheDocument();
  });

  it('shows the edition number', () => {
    render(<ListingDetail listing={L} />);
    expect(screen.getByText(/Edition 3/)).toBeInTheDocument();
  });
});
