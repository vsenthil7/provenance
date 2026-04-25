// components/art/ArtistHeader.tsx
'use client';

import { useUsername, displayName } from '@/lib/usernames';

export interface ArtistHeaderProps {
  address: string;
  username?: string;
}

export function ArtistHeader({ address, username }: ArtistHeaderProps) {
  // Reverse-resolve to confirm canonical username from chain.
  const { data: resolved } = useUsername(address);
  const display = resolved ?? (username ? `${username.replace(/\.init$/, '')}.init` : null);

  return (
    <header>
      <p className="font-mono text-xs uppercase tracking-widest text-ink/50">Artist</p>
      <h1 className="mt-1 font-display text-4xl text-ink">{displayName(address, display)}</h1>
      <p className="mt-1 font-mono text-xs text-ink/40">{address}</p>
    </header>
  );
}
