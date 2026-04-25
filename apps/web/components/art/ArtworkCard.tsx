import Link from 'next/link';
import { displayName } from '@/lib/usernames';
import { formatINIT } from '@/lib/format';

export interface ArtworkCardProps {
  drop: {
    id: number;
    title: string;
    artistAddress: string;
    artistUsername: string | null;
    imageUri: string;
    priceUinit: string;
    href: string;
  };
}

export function ArtworkCard({ drop }: ArtworkCardProps) {
  return (
    <Link
      href={drop.href}
      className="group block"
      data-testid={`artwork-card-${drop.id}`}
    >
      <div className="aspect-square overflow-hidden bg-ink/5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={drop.imageUri}
          alt={drop.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
        />
      </div>
      <div className="mt-3 flex items-baseline justify-between text-sm">
        <div>
          <p className="font-display text-base">{drop.title}</p>
          <p className="font-mono text-xs text-ink/60">
            {displayName(drop.artistAddress, drop.artistUsername)}
          </p>
        </div>
        <p className="font-mono text-xs">{formatINIT(drop.priceUinit)}</p>
      </div>
    </Link>
  );
}
