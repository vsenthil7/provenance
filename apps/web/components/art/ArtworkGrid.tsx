// components/art/ArtworkGrid.tsx
import Link from 'next/link';
import type { Artwork } from '@/lib/api/types';
import { EmptyState } from '@/components/common/EmptyState';

export interface ArtworkGridProps {
  artworks: Artwork[];
  ownedView?: boolean;
}

export function ArtworkGrid({ artworks, ownedView = false }: ArtworkGridProps) {
  if (artworks.length === 0) {
    return (
      <EmptyState
        title={ownedView ? 'No artworks yet' : 'No artworks in this collection'}
        body={ownedView ? 'Browse live drops to find your first piece.' : undefined}
      />
    );
  }

  return (
    <ul className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {artworks.map((art) => (
        <li key={art.id} className="group">
          <Link href={`/listing/${art.id}`} className="block">
            <div className="aspect-square overflow-hidden rounded-lg bg-ink/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={art.image_uri}
                alt={art.title}
                loading="lazy"
                className="h-full w-full object-cover transition-transform group-hover:scale-105"
              />
            </div>
            <div className="mt-3">
              <p className="font-display text-lg text-ink">{art.title}</p>
              <p className="font-mono text-xs text-ink/50">
                Edition {art.edition_no} · royalty {(art.royalty_bps / 100).toFixed(1)}%
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
