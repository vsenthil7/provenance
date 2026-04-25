import { NextRequest, NextResponse } from 'next/server';
import { assertSha256Hex, objectKey, publicUrl, R2_BUCKET, r2Client } from '@/lib/r2';
import { HeadObjectCommand } from '@aws-sdk/client-s3';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }
  const { contentType, contentHash } = (body ?? {}) as Record<string, unknown>;
  if (typeof contentType !== 'string' || typeof contentHash !== 'string') {
    return NextResponse.json({ error: 'missing fields' }, { status: 400 });
  }

  let hashHex: string;
  try {
    hashHex = assertSha256Hex(contentHash);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
  const key = objectKey(hashHex, contentType);

  try {
    const head = await r2Client().send(
      new HeadObjectCommand({ Bucket: R2_BUCKET, Key: key }),
    );
    if (!head.ContentLength || head.ContentLength <= 0) {
      return NextResponse.json({ error: 'object missing or empty' }, { status: 404 });
    }
  } catch (e) {
    return NextResponse.json(
      { error: 'object not found', detail: (e as Error).message },
      { status: 404 },
    );
  }

  return NextResponse.json({
    ok: true,
    key,
    publicUrl: publicUrl(key),
    contentHash: hashHex,
  });
}
