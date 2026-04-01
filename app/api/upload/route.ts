import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { authenticate } from '../../../lib/auth';
import { checkRateLimit, getRequestKey } from '../../../lib/rate-limit';

export const runtime = 'nodejs';

const allowedUploadTypes = new Set(['profile', 'post', 'chat', 'general']);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const fileEntry = formData.get('file');
    const requestedType = String(formData.get('type') ?? 'general');
    const type = allowedUploadTypes.has(requestedType) ? requestedType : 'general';

    const rate = checkRateLimit(getRequestKey(req, `upload:${type}`), 20, 10 * 60_000);
    if (!rate.allowed) {
      return NextResponse.json({ error: 'Too many uploads. Please wait a few minutes before trying again.' }, { status: 429 });
    }

    if ((type === 'post' || type === 'chat') && !authenticate(req)) {
      return NextResponse.json({ error: 'You must be signed in to upload this file' }, { status: 401 });
    }

    if (!(fileEntry instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const file = fileEntry;

    if (file.size === 0) {
      return NextResponse.json({ error: 'The selected file is empty' }, { status: 400 });
    }

    if (!(file.type.startsWith('image/') || file.type.startsWith('video/'))) {
      return NextResponse.json({ error: 'Only image or video files are allowed' }, { status: 400 });
    }

    const maxImageSize = 20 * 1024 * 1024;
    const maxVideoSize = 80 * 1024 * 1024;
    const maxSize = file.type.startsWith('video/') ? maxVideoSize : maxImageSize;
    if (file.size > maxSize) {
      const limitLabel = file.type.startsWith('video/') ? '80MB' : '20MB';
      return NextResponse.json({ error: `File is too large. Please keep it under ${limitLabel}.` }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', type);
    await fs.mkdir(uploadDir, { recursive: true });

    const ext = path.extname(file.name).toLowerCase() || (file.type.startsWith('video/') ? '.mp4' : '.jpg');
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    const filePath = path.join(uploadDir, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);

    const url = `/uploads/${type}/${filename}`;
    return NextResponse.json({ success: true, url, filename, mediaType: file.type, size: file.size });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      {
        error: 'Upload failed',
        details: error instanceof Error ? error.message : 'Unknown upload error',
      },
      { status: 500 }
    );
  }
}