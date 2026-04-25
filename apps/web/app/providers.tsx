'use client';

import { InterwovenKitProvider, TESTNET } from '@initia/interwovenkit-react';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { wagmiConfig } from '@/lib/chain/wagmi';
import { provenanceChain } from '@/lib/chain/customChain';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 3, staleTime: 30_000, refetchOnWindowFocus: false },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <InterwovenKitProvider
          {...TESTNET}
          defaultChainId={provenanceChain.chainId}
          customChain={provenanceChain}
        >
          {children}
        </InterwovenKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
