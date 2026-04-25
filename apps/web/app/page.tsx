import { ConnectButton } from '@/components/wallet/ConnectButton';
import { LiveDropsGrid } from '@/components/art/LiveDropsGrid';

export default function HomePage() {
  return (
    <div className="space-y-20">
      <section className="grid gap-10 md:grid-cols-2 md:gap-16">
        <div className="space-y-6">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink/60">
            INITIATE · HACK0016
          </p>
          <h1 className="font-display text-5xl leading-[1.05] md:text-6xl">
            Royalties enforced by Move resources.
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-ink/80">
            Provenance is a marketplace where royalty payment is not a policy. It is a structural
            property of how artwork ownership transfers work — every paid transfer routes through
            the protocol's <code className="font-mono text-sm">royalty::settle</code>, by
            construction.
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <ConnectButton />
            <a
              href="/about"
              className="text-sm underline underline-offset-4 hover:text-accent"
            >
              How it works →
            </a>
          </div>
        </div>
        <div className="rounded-sm border border-ink/10 bg-white p-8">
          <h3 className="mb-4 font-display text-2xl">For artists</h3>
          <p className="mb-4 text-ink/80">
            Mint a collection. Set your royalty once. Earn it on every secondary sale, forever,
            without trusting a marketplace policy.
          </p>
          <a
            href="/create/collection"
            className="font-mono text-sm uppercase tracking-wide text-accent hover:underline"
          >
            Create a collection →
          </a>
        </div>
      </section>

      <section>
        <div className="mb-6 flex items-baseline justify-between">
          <h2 className="font-display text-3xl">Live drops</h2>
          <a href="/discover" className="text-sm underline underline-offset-4">
            Browse all
          </a>
        </div>
        <LiveDropsGrid />
      </section>
    </div>
  );
}
