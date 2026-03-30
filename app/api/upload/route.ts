import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const type = (formData.get('type') as string) || 'general';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate mimetype
    if (!(file.type.startsWith('image/') || file.type.startsWith('video/'))) {
      return NextResponse.json({ error: 'Only image or video files are allowed' }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), 'public', 'uploads', type);
    // Ensure directory exists
    await fs.mkdir(uploadDir, { recursive: true });

    const ext = path.extname(file.name) || (file.type.startsWith('video/') ? '.mp4' : '.jpg');
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    const filePath = path.join(uploadDir, filename);

    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(filePath, buffer);

    const url = `/uploads/${type}/${filename}`;
    return NextResponse.json({ success: true, url, filename });
  } catch (err) {
    console.error('Upload error:', err);
    return NextResponse.json({ error: 'Upload failed', details: String(err) }, { status: 500 });
  }
}