import Link from 'next/link';
import { ConnectButton } from '@/components/wallet/ConnectButton';
import { AddFundsButton } from '@/components/bridge/AddFundsButton';

export function Header() {
  return (
    <header className="border-b border-ink/10">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="font-display text-2xl tracking-tight">
          Provenance
        </Link>
        <nav className="hidden items-center gap-8 font-mono text-sm uppercase tracking-wider md:flex">
          <Link href="/discover" className="hover:text-accent">
            Discover
          </Link>
          <Link href="/create/collection" className="hover:text-accent">
            Create
          </Link>
          <Link href="/portfolio" className="hover:text-accent">
            Portfolio
          </Link>
          <Link href="/settings/sessions" className="hover:text-accent">
            Sessions
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          <AddFundsButton />
          <ConnectButton />
        </div>
      </div>
    </header>
  );
}
