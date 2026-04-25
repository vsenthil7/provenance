import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ArtworkGrid } from './ArtworkGrid';
import type { Artwork } from '@/lib/api/types';

const A = (n: number, over: Partial<Artwork> = {}): Artwork => ({
  id: String(n),
  object_addr: `init1obj${n}`,
  collection_id: '1',
  edition_no: n,
  title: `Piece ${n}`,
  content_hash: '0xabcd',
  image_uri: `https://r2.example/${n}.png`,
  metadata_uri: null,
  royalty_bps: 500,
  creator_addr: 'init1artist',
  current_owner: 'init1artist',
  minted_at: '2026-04-01T00:00:00Z',
  ...over,
});

describe('ArtworkGrid', () => {
  it('renders empty state when no artworks (collection view)', () => {
    render(<ArtworkGrid artworks={[]} />);
    expect(screen.getByText(/No artworks in this collection/)).toBeInTheDocument();
  });

  it('renders empty state with owned-view copy', () => {
    render(<ArtworkGrid artworks={[]} ownedView />);
    expect(screen.getByText(/No artworks yet/)).toBeInTheDocument();
  });

  it('renders one tile per artwork', () => {
    render(<ArtworkGrid artworks={[A(1), A(2), A(3)]} />);
    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });

  it('shows title and royalty %', () => {
    render(<ArtworkGrid artworks={[A(1, { royalty_bps: 750 })]} />);
    expect(screen.getByText('Piece 1')).toBeInTheDocument();
    expect(screen.getByText(/7\.5%/)).toBeInTheDocument();
  });

  it('links to listing page', () => {
    render(<ArtworkGrid artworks={[A(42)]} />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/listing/42');
  });
});
