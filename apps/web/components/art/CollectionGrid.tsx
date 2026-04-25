// components/art/CollectionGrid.tsx
import Link from 'next/link';
import type { Collection } from '@/lib/api/types';
import { EmptyState } from '@/components/common/EmptyState';

export function CollectionGrid({ collections }: { collections: Collection[] }) {
  if (collections.length === 0) {
    return <EmptyState title="No collections yet" />;
  }
  return (
    <ul className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {collections.map((c) => (
        <li
          key={c.id}
          className="rounded-lg border border-ink/10 bg-paper p-6 transition-colors hover:border-accent"
        >
          <Link href={`/collection/${c.id}`}>
            <h3 className="font-display text-xl text-ink">{c.name}</h3>
            <p className="mt-1 font-mono text-xs uppercase tracking-wider text-ink/50">
              {c.symbol} · royalty {(c.default_royalty_bps / 100).toFixed(1)}%
            </p>
            <p className="mt-3 text-sm text-ink/70">
              {c.minted} {c.supply_cap ? `/ ${c.supply_cap}` : ''} minted
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
