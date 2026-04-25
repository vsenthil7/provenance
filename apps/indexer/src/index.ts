import { startPolling } from './sync';
import { makeDbWriter } from './writer';
import { runMigrations } from './migrate';

const ac = new AbortController();
process.on('SIGINT', () => ac.abort());
process.on('SIGTERM', () => ac.abort());

console.log('[indexer] running migrations');
await runMigrations();

const db = await makeDbWriter();
console.log('[indexer] starting Move event poller');
await startPolling(db, ac.signal);
