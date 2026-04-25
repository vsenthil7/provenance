'use client';

import { useQuery } from '@tanstack/react-query';
import { ArtworkCard } from './ArtworkCard';

interface Drop {
  id: number;
  title: string;
  artistAddress: string;
  artistUsername: string | null;
  imageUri: string;
  priceUinit: string;
  href: string;
}

async function fetchDrops(): Promise<Drop[]> {
  const res = await fetch('/api/graphql', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      query: `query LiveDrops {
        liveDrops(limit: 8) {
          id title artistAddress artistUsername imageUri priceUinit href
        }
      }`,
    }),
  });
  if (!res.ok) throw new Error('failed to load drops');
  const json = (await res.json()) as { data?: { liveDrops?: Drop[] } };
  return json?.data?.liveDrops ?? [];
}

export function LiveDropsGrid() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['live-drops'],
    queryFn: fetchDrops,
    refetchInterval: 30_000,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-6 md:grid-cols-4" data-testid="drops-loading">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="aspect-square animate-pulse bg-ink/5" />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <p className="font-mono text-sm text-ink/60" data-testid="drops-error">
        Couldn't load live drops. The indexer may be catching up.
      </p>
    );
  }

  if (!data || data.length === 0) {
    return (
      <p className="font-mono text-sm text-ink/60" data-testid="drops-empty">
        No live drops yet. <a href="/create/collection" className="underline">Mint the first.</a>
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
      {data.map((d) => (
        <ArtworkCard key={d.id} drop={d} />
      ))}
    </div>
  );
}
