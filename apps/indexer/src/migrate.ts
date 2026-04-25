// migrate.ts — apply migrations/*.sql in lexicographic order.
//
// Idempotent: each migration uses CREATE IF NOT EXISTS where applicable. A
// `_migrations` table tracks applied filenames so re-running is fast.

import { readdir, readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';

const MIGRATIONS_DIR = resolve(process.cwd(), 'migrations');

export async function runMigrations(databaseUrl: string = process.env.DATABASE_URL ?? ''): Promise<{ applied: string[] }> {
  if (!databaseUrl) throw new Error('DATABASE_URL is not set');
  const { Pool } = await import('pg');
  const pool = new (Pool as any)({ connectionString: databaseUrl });
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        filename TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    const files = (await readdir(MIGRATIONS_DIR))
      .filter((f) => f.endsWith('.sql'))
      .sort();
    const applied: string[] = [];
    for (const f of files) {
      const { rows } = await pool.query<{ filename: string }>(
        `SELECT filename FROM _migrations WHERE filename = $1`,
        [f],
      );
      if (rows.length > 0) continue;
      const sql = await readFile(join(MIGRATIONS_DIR, f), 'utf8');
      await pool.query('BEGIN');
      try {
        await pool.query(sql);
        await pool.query(`INSERT INTO _migrations (filename) VALUES ($1)`, [f]);
        await pool.query('COMMIT');
        applied.push(f);
        console.log(`[migrate] applied ${f}`);
      } catch (e) {
        await pool.query('ROLLBACK');
        throw e;
      }
    }
    return { applied };
  } finally {
    await pool.end();
  }
}
