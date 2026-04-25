import { LiveDropsGrid } from '@/components/art/LiveDropsGrid';

export default function DiscoverPage() {
  return (
    <div className="space-y-10">
      <header>
        <h1 className="mb-2 font-display text-4xl">Discover</h1>
        <p className="text-ink/70">
          Live drops, auctions, and recently-minted artworks across the protocol.
        </p>
      </header>
      <LiveDropsGrid />
    </div>
  );
}
