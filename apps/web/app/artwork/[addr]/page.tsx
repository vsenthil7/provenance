import { notFound } from 'next/navigation';
import Link from 'next/link';
import { fetchArtwork } from '@/lib/api/artwork';
import { displayName } from '@/lib/usernames';
import { formatINIT } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function ArtworkPage({
  params,
}: {
  params: Promise<{ addr: string }>;
}) {
  const { addr } = await params;
  const artwork = await fetchArtwork(addr);
  if (!artwork) notFound();

  return (
    <div className="grid grid-cols-1 gap-12 lg:grid-cols-2">
      <div>
        <div className="aspect-square overflow-hidden rounded-lg bg-ink/5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={artwork.image_uri}
            alt={artwork.title}
            className="h-full w-full object-cover"
          />
        </div>
      </div>
      <div>
        <p className="font-mono text-xs uppercase tracking-widest text-ink/50">
          Edition {artwork.edition_no} · royalty {(artwork.royalty_bps / 100).toFixed(1)}%
        </p>
        <h1 className="mt-1 font-display text-4xl text-ink">{artwork.title}</h1>
        <p className="mt-2 text-sm text-ink/60">
          By <Link href={`/artist/${artwork.creator_addr}`} className="underline hover:text-accent">
            {displayName(artwork.creator_addr, null)}
          </Link>
        </p>
        <p className="mt-4 font-mono text-xs text-ink/60">
          Currently owned by {displayName(artwork.current_owner, null)}
        </p>

        <div className="mt-8 flex gap-3">
          <Link
            href={`/artwork/${artwork.object_addr}/list`}
            className="bg-ink px-5 py-3 font-mono text-sm uppercase tracking-wider text-paper hover:bg-accent"
          >
            List for resale
          </Link>
        </div>

        <section className="mt-10">
          <h2 className="font-display text-xl text-ink">Provenance trail</h2>
          <p className="mt-2 text-sm text-ink/60">
            Every transfer is on-chain. Paid transfers route through{' '}
            <code className="font-mono text-xs">royalty::settle</code>; gifts are free
            and emit <code className="font-mono text-xs">GiftEvent</code>.
          </p>
          {artwork.transfers.length === 0 ? (
            <p className="mt-4 font-mono text-sm text-ink/50">
              Mint event only — never transferred.
            </p>
          ) : (
            <ol className="mt-4 space-y-2">
              {artwork.transfers.map((t) => (
                <li
                  key={t.txHash}
                  className="flex items-baseline justify-between border-b border-ink/10 pb-2 font-mono text-xs"
                  data-testid={`transfer-${t.kind}`}
                >
                  <span>
                    <span className="uppercase tracking-wider text-ink/60">
                      {t.kind === 'settle' ? 'Sale (royalty paid)' : 'Gift (free)'}
                    </span>
                    : {displayName(t.fromAddr, null)} → {displayName(t.toAddr, null)}
                  </span>
                  <span className="text-ink/40">{t.occurredAt}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
