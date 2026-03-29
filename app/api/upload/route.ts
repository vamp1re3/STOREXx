import { NextRequest, NextResponse } from 'next/server';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadType = req.query.type as string || 'general';
    let uploadPath = 'public/uploads/';

    switch (uploadType) {
      case 'profile':
        uploadPath += 'profiles';
        break;
      case 'post':
        uploadPath += 'posts';
        break;
      case 'chat':
        uploadPath += 'chat';
        break;
      default:
        uploadPath += 'general';
    }

    // Ensure directory exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Helper function to run multer middleware
function runMiddleware(req: NextRequest, res: any, fn: Function) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string || 'general';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Convert File to buffer for multer
    const buffer = Buffer.from(await file.arrayBuffer());
    const mockReq = {
      ...req,
      query: { type },
      file: {
        originalname: file.name,
        mimetype: file.type,
        buffer,
        size: file.size
      }
    } as any;

    const mockRes = {} as any;

    // Run multer
    await runMiddleware(mockReq, mockRes, upload.single('file'));

    // Generate URL
    const filename = mockReq.file.filename;
    const url = `/uploads/${type}/${filename}`;

    return NextResponse.json({
      success: true,
      url,
      filename
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Upload failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}