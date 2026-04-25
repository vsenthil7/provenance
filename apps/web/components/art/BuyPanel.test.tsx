import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BuyPanel } from './BuyPanel';
import type { Listing } from '@/lib/api/types';

const openConnect = vi.fn();
const requestTxBlock = vi.fn();
let kitState: any = {};

vi.mock('@initia/interwovenkit-react', () => ({
  useInterwovenKit: () => kitState,
}));

vi.mock('@/lib/chain/balance', () => ({
  fetchInitBalance: vi.fn(async () => 0n),
}));

vi.mock('@/lib/chain/messages', () => ({
  buildBuyNowMessage: vi.fn(() => ({ typeUrl: '/x', value: {} })),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const listing: Listing = {
  id: '1',
  object_addr: 'init1listing',
  artwork: {
    id: '1',
    object_addr: 'init1art',
    collection_id: '1',
    edition_no: 1,
    title: 'X',
    content_hash: 'aa',
    image_uri: '',
    metadata_uri: null,
    royalty_bps: 500,
    creator_addr: 'init1a',
    current_owner: 'init1a',
    minted_at: '2024-01-01',
  },
  seller_addr: 'init1a',
  price_uinit: '1000000', // 1 INIT
  expires_at: null,
  status: 'active',
  created_at: '2024-01-01',
};

function wrap(node: React.ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{node}</QueryClientProvider>);
}

beforeEach(() => {
  openConnect.mockClear();
  requestTxBlock.mockClear();
});

describe('<BuyPanel />', () => {
  it('shows connect prompt when no wallet', () => {
    kitState = { initiaAddress: undefined, openConnect, requestTxBlock };
    wrap(<BuyPanel listing={listing} />);
    expect(screen.getByText(/connect your wallet to continue/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /connect wallet/i })).toBeInTheDocument();
  });

  it('shows bridge prompt when balance is insufficient', async () => {
    kitState = { initiaAddress: 'init1c', openConnect, requestTxBlock };
    wrap(<BuyPanel listing={listing} />);
    expect(screen.getByText(/buy this piece/i)).toBeInTheDocument();
    // Balance starts undefined while query runs; the bridge button should be
    // visible once it resolves to 0n.
    expect(await screen.findByTestId('bridge-to-buy')).toBeInTheDocument();
  });

  it('mentions royalty guarantee in copy', () => {
    kitState = { initiaAddress: 'init1c', openConnect, requestTxBlock };
    wrap(<BuyPanel listing={listing} />);
    expect(screen.getByText(/royalty is paid to the artist/i)).toBeInTheDocument();
    expect(screen.getByText(/guaranteed by the move module/i)).toBeInTheDocument();
  });

  it('renders Buy button when balance is sufficient', async () => {
    const { fetchInitBalance } = await import('@/lib/chain/balance');
    (fetchInitBalance as any).mockResolvedValueOnce(10_000_000n);
    kitState = { initiaAddress: 'init1c', openConnect, requestTxBlock };
    wrap(<BuyPanel listing={listing} />);
    const buyBtn = await screen.findByRole('button', { name: /buy for/i });
    expect(buyBtn).toBeInTheDocument();
  });

  it('clicking connect button calls openConnect', () => {
    kitState = { initiaAddress: undefined, openConnect, requestTxBlock };
    wrap(<BuyPanel listing={listing} />);
    screen.getByRole('button', { name: /connect wallet/i }).click();
    expect(openConnect).toHaveBeenCalledOnce();
  });

  it('clicking buy submits the transaction', async () => {
    const { fetchInitBalance } = await import('@/lib/chain/balance');
    (fetchInitBalance as any).mockResolvedValue(10_000_000n);
    requestTxBlock.mockResolvedValueOnce({ txhash: 'OK' });
    kitState = { initiaAddress: 'init1c', openConnect, requestTxBlock };
    wrap(<BuyPanel listing={listing} />);
    const buyBtn = await screen.findByRole('button', { name: /buy for/i });
    buyBtn.click();
    // requestTxBlock is called asynchronously; await microtask flush
    await new Promise((r) => setTimeout(r, 0));
    expect(requestTxBlock).toHaveBeenCalledOnce();
  });

  it('toasts an error when buy throws', async () => {
    const { fetchInitBalance } = await import('@/lib/chain/balance');
    (fetchInitBalance as any).mockResolvedValue(10_000_000n);
    requestTxBlock.mockRejectedValueOnce(new Error('user rejected'));
    const sonner = await import('sonner');
    kitState = { initiaAddress: 'init1c', openConnect, requestTxBlock };
    wrap(<BuyPanel listing={listing} />);
    const buyBtn = await screen.findByRole('button', { name: /buy for/i });
    buyBtn.click();
    await new Promise((r) => setTimeout(r, 0));
    expect(sonner.toast.error).toHaveBeenCalled();
  });
});
