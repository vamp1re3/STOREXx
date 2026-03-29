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
    const result = await pool.query(
      'SELECT * FROM messages WHERE (sender_id=$1 AND receiver_id=$2) OR (sender_id=$2 AND receiver_id=$1) ORDER BY created_at',
      [currentUserId, userId]
    );
    return NextResponse.json(result.rows);
  } catch (error) {
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
    const { content, image_url } = await req.json();

    // Allow messages with either content or image_url
    if (!content && !image_url) {
      return NextResponse.json({ error: 'Message must have content or image' }, { status: 400 });
    }

    await pool.query(
      'INSERT INTO messages (sender_id, receiver_id, content, image_url) VALUES ($1, $2, $3, $4)',
      [currentUserId, userId, content || null, image_url || null]
    );
    return NextResponse.json({ message: 'Message sent' });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}