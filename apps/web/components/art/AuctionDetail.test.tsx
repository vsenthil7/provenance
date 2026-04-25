import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuctionDetail, formatRemaining } from './AuctionDetail';
import type { Auction } from '@/lib/api/types';

const futureIso = (secsFromNow: number) =>
  new Date(Date.now() + secsFromNow * 1000).toISOString();

const A = (over: Partial<Auction> = {}): Auction => ({
  id: '1',
  object_addr: 'init1auc',
  seller_addr: 'init1sell',
  reserve_uinit: '1000000',
  current_bid_uinit: '0',
  current_bidder: null,
  min_increment_bps: 200,
  ends_at: futureIso(3600),
  extension_secs: 300,
  status: 'live',
  artwork: {
    id: '1',
    object_addr: 'init1art',
    collection_id: '1',
    edition_no: 1,
    title: 'Test',
    content_hash: '0xabcd',
    image_uri: 'https://r2.example/x.png',
    metadata_uri: null,
    royalty_bps: 750,
    creator_addr: 'init1artist',
    current_owner: 'init1sell',
    minted_at: '2026-04-01T00:00:00Z',
  },
  ...over,
});

describe('formatRemaining', () => {
  it('returns "ended" for zero or negative', () => {
    expect(formatRemaining(0)).toBe('ended');
    expect(formatRemaining(-5_000)).toBe('ended');
  });

  it('zero-pads single digits', () => {
    expect(formatRemaining(5_000)).toBe('00:00:05');
  });

  it('formats hours/min/sec', () => {
    expect(formatRemaining(3_661_000)).toBe('01:01:01');
  });
});

describe('AuctionDetail', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('renders title and edition', () => {
    render(<AuctionDetail auction={A()} />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Test');
    expect(screen.getByText(/Edition 1/)).toBeInTheDocument();
  });

  it('shows reserve when no bids yet', () => {
    render(<AuctionDetail auction={A()} />);
    expect(screen.getByText(/Reserve\s+1/)).toBeInTheDocument();
  });

  it('shows current bid when bids exist', () => {
    render(<AuctionDetail auction={A({ current_bid_uinit: '2500000' })} />);
    expect(screen.getByText(/2\.5\s*INIT/)).toBeInTheDocument();
  });

  it('renders countdown', () => {
    render(<AuctionDetail auction={A()} />);
    expect(screen.getByTestId('auction-countdown')).toBeInTheDocument();
  });

  it('shows royalty and status', () => {
    render(<AuctionDetail auction={A()} />);
    expect(screen.getByText('7.5%')).toBeInTheDocument();
    expect(screen.getByText('live')).toBeInTheDocument();
  });
});
