import { createConfig } from '@ponder/core';

// Provenance is a MiniMove rollup, not an EVM chain, so we use Ponder's
// custom-source extension. The `chain` block points at our Initia RPC
// endpoint; the actual event polling is implemented in src/sync/move.ts and
// runs as a process alongside Ponder.
//
// In Phase 1.5 (post-hackathon) we plan to switch to native Move support
// when Ponder lands it; until then, src/sync/move.ts is a hand-rolled poller
// that emits events through Ponder's `db` API.

export default createConfig({
  database: {
    kind: 'postgres',
    connectionString: process.env.DATABASE_URL,
  },
  // Stub the networks block so Ponder boots; our actual sync happens in
  // src/index.ts via a custom polling loop.
  networks: {},
});
