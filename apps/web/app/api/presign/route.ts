import { NextRequest, NextResponse } from 'next/server';
import { assertSha256Hex, objectKey, presignPut, publicUrl, validateUpload } from '@/lib/r2';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid JSON' }, { status: 400 });
  }
  const { contentType, size, contentHash } = (body ?? {}) as Record<string, unknown>;

  if (typeof contentType !== 'string' || typeof size !== 'number' || typeof contentHash !== 'string') {
    return NextResponse.json({ error: 'missing fields' }, { status: 400 });
  }

  const v = validateUpload({ contentType, size });
  if (!v.ok) {
    return NextResponse.json({ error: v.reason }, { status: 400 });
  }

  let hashHex: string;
  try {
    hashHex = assertSha256Hex(contentHash);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }

  const key = objectKey(hashHex, contentType);
  let url: string;
  try {
    url = await presignPut(key, contentType);
  } catch (e) {
    return NextResponse.json({ error: 'presign failed', detail: (e as Error).message }, { status: 502 });
  }

  return NextResponse.json({
    uploadUrl: url,
    key,
    publicUrl: publicUrl(key),
    contentHash: hashHex,
  });
}
