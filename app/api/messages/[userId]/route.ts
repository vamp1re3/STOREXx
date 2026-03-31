import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import pool from '../../../../lib/db';

function getUserId(req: NextRequest): number | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return null;
  try {
    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: number };
    return decoded.id;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest, context: { params: Promise<{ userId: string }> }) {
  try {
    const currentUserId = getUserId(req);
    if (!currentUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { userId } = await context.params;
    const blocked = await pool.query(
      'SELECT 1 FROM blocks WHERE (blocker_id=$1 AND blocked_id=$2) OR (blocker_id=$2 AND blocked_id=$1)',
      [currentUserId, userId]
    );

    if (blocked.rows.length > 0) {
      return NextResponse.json({ error: 'Message access blocked' }, { status: 403 });
    }

    const result = await pool.query(
      'SELECT * FROM messages WHERE (sender_id=$1 AND receiver_id=$2) OR (sender_id=$2 AND receiver_id=$1) ORDER BY created_at',
      [currentUserId, userId]
    );
    return NextResponse.json(result.rows);
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, context: { params: Promise<{ userId: string }> }) {
  try {
    const currentUserId = getUserId(req);
    if (!currentUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { userId } = await context.params;
    const { content, image_url, media_type } = await req.json();

    if (!content && !image_url) {
      return NextResponse.json({ error: 'Message must have content or media' }, { status: 400 });
    }

    const blocked = await pool.query(
      'SELECT 1 FROM blocks WHERE (blocker_id=$1 AND blocked_id=$2) OR (blocker_id=$2 AND blocked_id=$1)',
      [currentUserId, userId]
    );

    if (blocked.rows.length > 0) {
      return NextResponse.json({ error: 'Message access blocked' }, { status: 403 });
    }

    const type = media_type === 'video' ? 'video' : 'image';

    await pool.query(
      'INSERT INTO messages (sender_id, receiver_id, content, image_url, media_type) VALUES ($1, $2, $3, $4, $5)',
      [currentUserId, userId, content || null, image_url || null, type]
    );
    return NextResponse.json({ message: 'Message sent' });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}