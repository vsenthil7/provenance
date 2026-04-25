import { NextResponse } from 'next/server';
import { pollChainHealth } from '@/lib/health';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const r = await pollChainHealth();
  return NextResponse.json({
    chainHealthy: r.healthy,
    blockHeight: r.height,
    checkedAt: new Date().toISOString(),
  });
}
