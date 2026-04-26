import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// InterwovenKitProvider performs network/wallet setup at mount which we don't
// want in a unit test. Replace it with a thin pass-through that just renders
// children. Same for WagmiProvider — its real implementation tries to read
// from a registered config and we provide our own at import time.
vi.mock('@initia/interwovenkit-react', () => ({
  InterwovenKitProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="ikit-provider">{children}</div>
  ),
  TESTNET: { rpcUrl: 'https://rpc.initiation-2.initia.xyz' },
}));

vi.mock('wagmi', () => ({
  WagmiProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="wagmi-provider">{children}</div>
  ),
}));

vi.mock('@tanstack/react-query', () => ({
  QueryClient: vi.fn().mockImplementation((opts: unknown) => ({ opts })),
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="query-provider">{children}</div>
  ),
}));

vi.mock('@/lib/chain/wagmi', () => ({
  wagmiConfig: { id: 'mock-wagmi-config' },
}));

vi.mock('@/lib/chain/customChain', () => ({
  provenanceChain: { chainId: 'provenance-1', rpcUrl: 'http://localhost:1317' },
}));

import { Providers } from './providers';

describe('<Providers />', () => {
  it('mounts the Wagmi → Query → InterwovenKit provider stack and renders children', () => {
    render(
      <Providers>
        <span data-testid="kid">child</span>
      </Providers>,
    );
    // Outer wagmi provider present
    expect(screen.getByTestId('wagmi-provider')).toBeInTheDocument();
    // Query client provider present
    expect(screen.getByTestId('query-provider')).toBeInTheDocument();
    // InterwovenKit provider present
    expect(screen.getByTestId('ikit-provider')).toBeInTheDocument();
    // Children rendered through the stack
    expect(screen.getByTestId('kid')).toHaveTextContent('child');
  });

  it('constructs a QueryClient with retry/staleTime/refetchOnWindowFocus defaults', async () => {
    const rq = await import('@tanstack/react-query');
    const calls = (rq.QueryClient as unknown as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls.length).toBeGreaterThanOrEqual(1);
    const opts = calls[0][0] as { defaultOptions: { queries: Record<string, unknown> } };
    expect(opts.defaultOptions.queries.retry).toBe(3);
    expect(opts.defaultOptions.queries.staleTime).toBe(30_000);
    expect(opts.defaultOptions.queries.refetchOnWindowFocus).toBe(false);
  });
});
