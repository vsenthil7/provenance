// components/art/CollectionHeader.tsx
import type { Collection } from '@/lib/api/types';

export function CollectionHeader({ collection }: { collection: Collection }) {
  return (
    <header>
      <p className="font-mono text-xs uppercase tracking-widest text-ink/50">
        Collection - {collection.symbol}
      </p>
      <h1 className="mt-1 font-display text-4xl text-ink">{collection.name}</h1>
      <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm text-ink/70">
        <div>
          <dt className="font-mono text-xs uppercase tracking-wider text-ink/40">Royalty</dt>
          <dd>{(collection.default_royalty_bps / 100).toFixed(1)}%</dd>
        </div>
        <div>
          <dt className="font-mono text-xs uppercase tracking-wider text-ink/40">Minted</dt>
          <dd>
            {collection.minted}
            {collection.supply_cap ? ' / ' + collection.supply_cap : ' (open edition)'}
          </dd>
        </div>
        <div>
          <dt className="font-mono text-xs uppercase tracking-wider text-ink/40">Status</dt>
          <dd>{collection.frozen ? 'Frozen' : 'Active'}</dd>
        </div>
      </dl>
    </header>
  );
}
