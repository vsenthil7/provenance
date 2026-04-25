'use client';

import { useEffect, useState } from 'react';
import { useHealth, pollChainHealth } from '@/lib/health';

const SIX_CONDITIONS = [
  'Independent Move audit (no findings ≥ medium severity, all "high"+ remediated)',
  'IPFS mirror for image bytes (currently R2-only)',
  'Decentralised sequencer or signed roadmap to one (currently single sequencer)',
  'Wash-trade detection or honest "we do not detect this" disclosure on every artwork page',
  'Off-Initia mainnet RPC SLA + multi-region failover',
  'Multi-team challenger setup (currently single challenger)',
];

export default function StatusPage() {
  const state = useHealth();
  const [lastFetch, setLastFetch] = useState<{ healthy: boolean; height: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function tick() {
      const r = await pollChainHealth();
      if (!cancelled) {
        setLastFetch(r);
        useHealth.getState().setHealth({ healthy: r.healthy, height: r.height, at: Date.now() });
      }
    }
    tick();
    const i = setInterval(tick, 15_000);
    return () => {
      cancelled = true;
      clearInterval(i);
    };
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-12">
      <header>
        <h1 className="mb-2 font-display text-4xl">System status</h1>
        <p className="text-ink/70">
          We tell the truth here. Honest failure modes beat polished marketing every time.
        </p>
      </header>

      <section data-testid="status-current">
        <h2 className="mb-4 font-display text-2xl">Now</h2>
        <dl className="space-y-3 font-mono text-sm">
          <div className="flex items-baseline justify-between border-b border-ink/10 pb-2">
            <dt>Chain</dt>
            <dd>
              {state.chainHealthy ? (
                <span className="text-green-700">healthy</span>
              ) : (
                <span className="text-accent">interrupted</span>
              )}
            </dd>
          </div>
          <div className="flex items-baseline justify-between border-b border-ink/10 pb-2">
            <dt>Block height</dt>
            <dd>{lastFetch?.height ?? '—'}</dd>
          </div>
          <div className="flex items-baseline justify-between border-b border-ink/10 pb-2">
            <dt>Image storage</dt>
            <dd>R2 only — no IPFS mirror in v0.1.0</dd>
          </div>
          <div className="flex items-baseline justify-between border-b border-ink/10 pb-2">
            <dt>Sequencer</dt>
            <dd>single (no decentralisation in v0.1.0)</dd>
          </div>
          <div className="flex items-baseline justify-between border-b border-ink/10 pb-2">
            <dt>Move audit</dt>
            <dd>none</dd>
          </div>
        </dl>
      </section>

      <section>
        <h2 className="mb-4 font-display text-2xl">Six conditions for production</h2>
        <p className="mb-4 text-sm text-ink/70">
          v0.1.0 is hackathon software. None of these are met yet. We will publish progress against
          each one as it is closed.
        </p>
        <ol className="space-y-3 text-sm">
          {SIX_CONDITIONS.map((c, i) => (
            <li
              key={i}
              className="flex gap-4 border-l-2 border-ink/10 pl-4"
              data-testid={`condition-${i + 1}`}
            >
              <span className="font-mono text-ink/40">{String(i + 1).padStart(2, '0')}</span>
              <span>{c}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
