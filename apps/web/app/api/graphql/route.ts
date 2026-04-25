import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const INDEXER_URL =
  process.env.INDEXER_GRAPHQL_URL ?? 'http://localhost:42069/graphql';

export async function POST(req: NextRequest) {
  let body: string;
  try {
    body = await req.text();
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }
  try {
    const upstream = await fetch(INDEXER_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body,
    });
    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: { 'content-type': upstream.headers.get('content-type') ?? 'application/json' },
    });
  } catch (e) {
    return NextResponse.json(
      { error: 'indexer unreachable', detail: (e as Error).message },
      { status: 502 },
    );
  }
}
