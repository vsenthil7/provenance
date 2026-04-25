'use client';

import { useQuery } from '@tanstack/react-query';
import { useKit } from '@/lib/wallet/kit';
import Link from 'next/link';
import { displayName } from '@/lib/usernames';

interface Holding {
  artworkId: number;
  objectAddr: string;
  title: string;
  imageUri: string;
  collectionName: string;
  creatorAddr: string;
  creatorUsername: string | null;
  royaltyBps: number;
}

async function fetchPortfolio(addr: string): Promise<Holding[]> {
  const res = await fetch('/api/graphql', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      query: `query Portfolio($owner: String!) {
        portfolio(owner: $owner) {
          artworkId objectAddr title imageUri collectionName creatorAddr creatorUsername royaltyBps
        }
      }`,
      variables: { owner: addr },
    }),
  });
  if (!res.ok) throw new Error('failed to load portfolio');
  const json = (await res.json()) as { data?: { portfolio?: Holding[] } };
  return json.data?.portfolio ?? [];
}

export default function PortfolioPage() {
  const { initiaAddress } = useKit();
  const { data, isLoading, isError } = useQuery({
    queryKey: ['portfolio', initiaAddress],
    enabled: !!initiaAddress,
    queryFn: () => fetchPortfolio(initiaAddress as string),
  });

  if (!initiaAddress) {
    return (
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="mb-4 font-display text-4xl">Portfolio</h1>
        <p className="text-ink/70">Connect a wallet to see what you own.</p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <header>
        <h1 className="mb-2 font-display text-4xl">Portfolio</h1>
        <p className="text-ink/70">
          Pieces you currently own. Listing one for resale routes the next sale through{' '}
          <code className="font-mono text-sm">royalty::settle</code> — the original artist gets
          paid every time, automatically.
        </p>
      </header>

      {isLoading && <p data-testid="portfolio-loading">Loading…</p>}
      {isError && <p data-testid="portfolio-error">Couldn&apos;t load portfolio.</p>}

      {data && data.length === 0 && (
        <div className="rounded-sm border border-ink/10 bg-white p-12 text-center">
          <p className="mb-4 text-ink/70">No artworks yet.</p>
          <Link
            href="/"
            className="inline-block bg-ink px-6 py-3 font-mono text-sm uppercase tracking-wider text-paper hover:bg-accent"
          >
            Browse drops
          </Link>
        </div>
      )}

      {data && data.length > 0 && (
        <div className="grid gap-6 md:grid-cols-3">
          {data.map((h) => (
            <article
              key={h.objectAddr}
              data-testid={`portfolio-item-${h.artworkId}`}
              className="overflow-hidden rounded-sm border border-ink/10 bg-white"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={h.imageUri} alt={h.title} className="aspect-square w-full object-cover" />
              <div className="p-5">
                <p className="font-display text-lg">{h.title}</p>
                <p className="font-mono text-xs text-ink/60">
                  {displayName(h.creatorAddr, h.creatorUsername)} · {h.collectionName}
                </p>
                <p className="mt-2 font-mono text-xs text-ink/60">
                  Resale royalty: {(h.royaltyBps / 100).toFixed(2)}% to artist
                </p>
                <div className="mt-4 flex gap-2">
                  <Link
                    href={`/artwork/${h.objectAddr}`}
                    className="flex-1 border border-ink py-2 text-center font-mono text-xs uppercase tracking-wider hover:bg-ink hover:text-paper"
                  >
                    View
                  </Link>
                  <Link
                    href={`/transfer?artwork=${h.objectAddr}`}
                    data-testid={`gift-${h.artworkId}`}
                    className="flex-1 border border-ink/40 py-2 text-center font-mono text-xs uppercase tracking-wider hover:border-ink"
                  >
                    Gift
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
