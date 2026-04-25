'use client';

import { useKit } from '@/lib/wallet/kit';
import { displayName } from '@/lib/usernames';

export function ConnectButton() {
  const { initiaAddress, username, openConnect, openProfile } = useKit();

  if (!initiaAddress) {
    return (
      <button
        type="button"
        onClick={openConnect}
        className="rounded-none border border-ink bg-ink px-5 py-3 font-mono text-sm uppercase tracking-wider text-paper transition-colors hover:bg-accent hover:border-accent"
      >
        Connect wallet
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={openProfile}
      className="rounded-none border border-ink/40 px-4 py-2 font-mono text-sm hover:border-ink"
      data-testid="connected-button"
    >
      {displayName(initiaAddress, username ? `${username}.init` : null)}
    </button>
  );
}
