import Link from 'next/link';

export function Footer() {
  return (
    <footer className="mt-24 border-t border-ink/10">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <p className="font-display text-xl">Provenance</p>
            <p className="mt-2 text-sm text-ink/60">
              Royalties enforced by the type system. Hackathon software, honestly labelled.
            </p>
          </div>
          <div className="text-sm">
            <p className="mb-2 font-mono uppercase tracking-wider text-ink/60">Build</p>
            <ul className="space-y-1">
              <li>
                <Link href="/status" className="hover:underline">
                  System status
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/provenance-org/provenance"
                  className="hover:underline"
                >
                  Source
                </a>
              </li>
              <li>
                <a
                  href="https://github.com/provenance-org/provenance/blob/main/docs/CUSTOMER_BUYER_REVIEW.md"
                  className="hover:underline"
                >
                  What this is not
                </a>
              </li>
            </ul>
          </div>
          <div className="text-sm">
            <p className="mb-2 font-mono uppercase tracking-wider text-ink/60">Chain</p>
            <ul className="space-y-1">
              <li>provenance-1 (testnet)</li>
              <li>MiniMove · Celestia mocha-4</li>
              <li>
                <a
                  href="https://scan.testnet.initia.xyz/provenance-1"
                  className="hover:underline"
                >
                  InitiaScan →
                </a>
              </li>
            </ul>
          </div>
          <div className="text-sm">
            <p className="mb-2 font-mono uppercase tracking-wider text-ink/60">License</p>
            <ul className="space-y-1">
              <li>Code: MIT</li>
              <li>Docs: CC-BY-SA 4.0</li>
            </ul>
          </div>
        </div>
        <p className="mt-10 text-xs text-ink/40">
          Provenance v0.1.0-hackathon. No audit. R2-only image storage. Single sequencer. Six
          conditions stand between this and production — see{' '}
          <Link href="/status" className="underline">
            /status
          </Link>
          .
        </p>
      </div>
    </footer>
  );
}
