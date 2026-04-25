import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BidPanel } from './BidPanel';
import { useSettings } from '@/lib/settings/store';

const requestTxBlock = vi.fn();
let mockKit: any = {};

vi.mock('@initia/interwovenkit-react', () => ({
  useInterwovenKit: () => mockKit,
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));
import { toast } from 'sonner';

beforeEach(() => {
  requestTxBlock.mockReset();
  (toast.success as any).mockClear();
  (toast.error as any).mockClear();
  useSettings.getState().disable();
  mockKit = {
    initiaAddress: 'init1abc',
    requestTxBlock,
  };
});

const baseProps = {
  auctionObjectAddr: 'init1auc',
  currentBidUinit: 0n,
  reserveUinit: 1_000_000n,
  minIncrementBps: 200,
};

describe('<BidPanel />', () => {
  it('renders the regular sign button when autosign disabled', () => {
    render(<BidPanel {...baseProps} />);
    expect(screen.getByTestId('bid-sign')).toBeInTheDocument();
    expect(screen.getByText(/enable 1-tap bidding/i)).toBeInTheDocument();
  });

  it('renders the 1-tap button when autosign enabled', () => {
    useSettings.getState().enable(3600, 'init1xxx::auction::place_bid', Math.floor(Date.now() / 1000) + 3600);
    render(<BidPanel {...baseProps} />);
    expect(screen.getByTestId('bid-tap')).toBeInTheDocument();
  });

  it('rejects bid when wallet not connected', async () => {
    mockKit = { initiaAddress: undefined, requestTxBlock };
    render(<BidPanel {...baseProps} />);
    fireEvent.change(screen.getByLabelText(/bid amount/i), { target: { value: '5' } });
    fireEvent.click(screen.getByTestId('bid-sign'));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Connect a wallet first.'));
  });

  it('rejects bid below minimum', async () => {
    render(<BidPanel {...baseProps} currentBidUinit={10_000_000n} />);
    fireEvent.change(screen.getByLabelText(/bid amount/i), { target: { value: '5' } });
    fireEvent.click(screen.getByTestId('bid-sign'));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/at least/i)));
  });

  it('calls requestTxBlock with place_bid shape', async () => {
    requestTxBlock.mockResolvedValue({ txhash: 'abc' });
    render(<BidPanel {...baseProps} />);
    fireEvent.change(screen.getByLabelText(/bid amount/i), { target: { value: '5' } });
    fireEvent.click(screen.getByTestId('bid-sign'));
    await waitFor(() => expect(requestTxBlock).toHaveBeenCalledOnce());
    const arg = requestTxBlock.mock.calls[0][0];
    expect(arg.chainId).toBe('provenance-1');
    expect(arg.messages[0].value.functionName).toBe('place_bid');
    expect(arg.messages[0].value.moduleName).toBe('auction');
  });

  it('shows error toast on tx failure', async () => {
    requestTxBlock.mockRejectedValue(new Error('insufficient funds'));
    render(<BidPanel {...baseProps} />);
    fireEvent.change(screen.getByLabelText(/bid amount/i), { target: { value: '5' } });
    fireEvent.click(screen.getByTestId('bid-sign'));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(expect.stringContaining('insufficient funds')));
  });

  it('disables the button when amount empty', () => {
    render(<BidPanel {...baseProps} />);
    expect(screen.getByTestId('bid-sign')).toBeDisabled();
  });

  it('shows reserve as minimum when no bids yet', () => {
    render(<BidPanel {...baseProps} reserveUinit={3_000_000n} />);
    expect(screen.getByText(/3 INIT/)).toBeInTheDocument();
  });

  it('computes minimum as current + increment when bids exist', () => {
    render(<BidPanel {...baseProps} currentBidUinit={10_000_000n} minIncrementBps={500} />);
    // 10 + 5% = 10.5
    expect(screen.getByText(/10\.5 INIT/)).toBeInTheDocument();
  });

  it('rejects invalid bid amount input', async () => {
    render(<BidPanel {...baseProps} />);
    fireEvent.change(screen.getByLabelText(/bid amount/i), { target: { value: 'abc' } });
    fireEvent.click(screen.getByTestId('bid-sign'));
    // initToUinit will throw -> error toast
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
  });
});
