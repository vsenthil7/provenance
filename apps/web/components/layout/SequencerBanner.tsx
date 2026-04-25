'use client';

import { useEffect } from 'react';
import { pollChainHealth, shouldShowSequencerBanner, useHealth } from '@/lib/health';

export function SequencerBanner() {
  const state = useHealth();

  useEffect(() => {
    let cancelled = false;
    async function tick() {
      const r = await pollChainHealth();
      if (!cancelled) {
        useHealth.getState().setHealth({ healthy: r.healthy, height: r.height, at: Date.now() });
      }
    }
    tick();
    const i = setInterval(tick, 30_000);
    return () => {
      cancelled = true;
      clearInterval(i);
    };
  }, []);

  if (!shouldShowSequencerBanner(state, Date.now())) return null;

  return (
    <div
      role="status"
      data-testid="sequencer-banner"
      className="bg-accent text-paper"
    >
      <div className="mx-auto max-w-6xl px-6 py-2 text-center font-mono text-xs uppercase tracking-wider">
        Sequencer interruption — block production paused. Existing balances and ownership are
        unaffected. <a href="/status" className="underline">Status</a>
      </div>
    </div>
  );
}
