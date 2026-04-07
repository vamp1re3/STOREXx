import { NextRequest, NextResponse } from 'next/server';
import cloudinary from '../../../lib/cloudinary';
import { authenticate } from '../../../lib/auth';
import { checkRateLimit, getRequestKey } from '../../../lib/rate-limit';

export const runtime = 'nodejs';

const allowedUploadTypes = new Set(['profile', 'post', 'chat', 'general']);

export async function POST(req: NextRequest) {
  try {
    console.log('Upload request received');
    const formData = await req.formData();
    const fileEntry = formData.get('file');
    const requestedType = String(formData.get('type') ?? 'general');
    const type = allowedUploadTypes.has(requestedType) ? requestedType : 'general';

    console.log('Upload type:', type, 'File entry:', !!fileEntry);

    const rate = checkRateLimit(getRequestKey(req, `upload:${type}`), 50, 10 * 60_000);
    if (!rate.allowed) {
      return NextResponse.json({ error: 'Too many uploads. Please wait a few minutes before trying again.' }, { status: 429 });
    }

    if ((type === 'post' || type === 'chat') && !authenticate(req)) {
      console.log('Authentication failed for upload type:', type);
      return NextResponse.json({ error: 'You must be signed in to upload this file' }, { status: 401 });
    }

    if (!fileEntry || typeof fileEntry !== 'object') {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const file = fileEntry as File;

    if (file.size === 0) {
      return NextResponse.json({ error: 'The selected file is empty' }, { status: 400 });
    }

    // More permissive file type check - allow empty type or common formats
    const isValidType = !file.type ||
      file.type.startsWith('image/') ||
      file.type.startsWith('video/') ||
      // Allow HEIC and other iOS formats
      file.type === 'image/heic' ||
      file.type === 'image/heif' ||
      // Allow common video formats that might not have proper MIME types
      file.name.toLowerCase().match(/\.(mp4|mov|avi|webm|m4v)$/);

    if (!isValidType) {
      return NextResponse.json({ error: 'Only image or video files are allowed' }, { status: 400 });
    }

    // Reasonable limits for Vercel (keep under 4.5MB request limit)
    const maxImageSize = 4 * 1024 * 1024; // 4MB for images
    const maxVideoSize = 10 * 1024 * 1024; // 10MB for videos (still might be tight)
    const maxSize = file.type.startsWith('video/') ? maxVideoSize : maxImageSize;

    if (file.size > maxSize) {
      const limitLabel = file.type.startsWith('video/') ? '10MB' : '4MB';
      return NextResponse.json({ error: `File is too large. Please keep it under ${limitLabel}.` }, { status: 400 });
    }

    // Check if Cloudinary is configured
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      return NextResponse.json({ error: 'File upload service is not configured. Please contact the administrator.' }, { status: 500 });
    }

    // Convert file to buffer for Cloudinary upload
    const buffer = Buffer.from(await file.arrayBuffer());

    // Upload to Cloudinary
    const uploadResult = await new Promise<{
      secure_url: string;
      public_id: string;
      width?: number;
      height?: number;
      original_filename?: string;
      resource_type: string;
    }>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `storex/${type}`,
          resource_type: 'auto',
          public_id: `${Date.now()}-${Math.round(Math.random() * 1e9)}`,
          // Optimize images
          ...(file.type.startsWith('image/') && {
            transformation: [
              { width: 1200, height: 1200, crop: 'limit' },
              { quality: 'auto' }
            ]
          })
        },
        (error, result) => {
          if (error) reject(error);
          else if (result) resolve(result);
          else reject(new Error('Upload failed: no result returned'));
        }
      );

      uploadStream.end(buffer);
    });

    const url = uploadResult.secure_url;
    const publicId = uploadResult.public_id;

    return NextResponse.json({
      success: true,
      url,
      publicId,
      filename: uploadResult.original_filename || 'uploaded-file',
      mediaType: file.type || uploadResult.resource_type,
      size: file.size,
      width: uploadResult.width,
      height: uploadResult.height
    });
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