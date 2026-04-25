import Link from 'next/link';

export default function AboutPage() {
  return (
    <article className="prose prose-stone mx-auto max-w-3xl">
      <p className="font-mono text-xs uppercase tracking-wider text-ink/60">How it works</p>
      <h1 className="mt-1 font-display text-4xl">Royalties, by construction.</h1>

      <p className="mt-6 text-lg leading-relaxed text-ink/80">
        Every NFT marketplace before us promised royalties. Then every NFT marketplace
        before us made them optional, because there was no structural way to enforce them.
        The minute one marketplace stopped paying, the rest had to follow or lose volume.
        Artists lost an industry of revenue, almost overnight.
      </p>

      <h2 className="mt-12 font-display text-2xl">The Move resource trick</h2>
      <p className="text-ink/80">
        Provenance runs on a Move-based appchain. An artwork is a{' '}
        <code className="font-mono text-sm">Object&lt;Artwork&gt;</code> resource — a Move
        type that cannot be duplicated, dropped, or moved without explicit code paths
        we control. The helper that transfers an artwork in exchange for INIT is{' '}
        <code className="font-mono text-sm">artwork::transfer_via_settle</code> and it
        has <code className="font-mono text-sm">friend</code> visibility. The only
        friend is <code className="font-mono text-sm">provenance::royalty</code>.
      </p>
      <p className="text-ink/80">
        That means: any transaction that moves an artwork AND moves money has to call
        our <code className="font-mono text-sm">royalty::settle</code>. There is no
        permissionless <code className="font-mono text-sm">transferFrom</code> that a
        rival marketplace can pair with a separate payment to skip the royalty. It is
        not a policy. It is the type system.
      </p>

      <h2 className="mt-12 font-display text-2xl">What about gifts?</h2>
      <p className="text-ink/80">
        Free transfers (gifts) are allowed. They emit{' '}
        <code className="font-mono text-sm">GiftEvent</code> on-chain so off-chain
        trade-bypass attempts are at least observable. A buyer who tries to bribe a
        seller off-chain via a Venmo + gift workflow can do so — but at that point the
        buyer has lost the cryptographic guarantee they came for, and we are no
        different from any other marketplace.
      </p>

      <h2 className="mt-12 font-display text-2xl">What about you?</h2>
      <p className="text-ink/80">
        If you&apos;re an artist, mint a collection, set your royalty once, and earn it
        on every secondary sale forever — without trusting a marketplace policy, without
        re-signing onto a new platform every six months.
      </p>
      <p className="mt-4">
        <Link
          href="/create/collection"
          className="inline-block bg-ink px-5 py-3 font-mono text-sm uppercase tracking-wider text-paper hover:bg-accent"
        >
          Create a collection
        </Link>
      </p>

      <h2 className="mt-12 font-display text-2xl">Honest caveats</h2>
      <p className="text-ink/70">
        v0.1.0 is hackathon software. We have not been audited. Image bytes live on
        R2 (with an IPFS mirror committed for v1.1). The sequencer is single-team. Six
        conditions stand between this and a production release. They are listed at{' '}
        <Link href="/status" className="underline">
          /status
        </Link>{' '}
        and we will publish progress against each as it closes.
      </p>
    </article>
  );
}
