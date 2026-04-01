import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../../lib/db';
import { authenticate } from '../../../../lib/auth';

export async function GET(req: NextRequest, context: { params: Promise<{ userId: string }> }) {
  try {
    const authUser = authenticate(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await context.params;
    const otherUserId = Number(userId);

    const blocked = await pool.query(
      'SELECT 1 FROM blocks WHERE (blocker_id=$1 AND blocked_id=$2) OR (blocker_id=$2 AND blocked_id=$1)',
      [authUser.id, otherUserId]
    );

    if (blocked.rows.length > 0) {
      return NextResponse.json({ error: 'Message access blocked' }, { status: 403 });
    }

    await pool.query(
      'UPDATE messages SET read_at = CURRENT_TIMESTAMP WHERE sender_id = $1 AND receiver_id = $2 AND read_at IS NULL',
      [otherUserId, authUser.id]
    );

    const [result, chatUser] = await Promise.all([
      pool.query(
        'SELECT * FROM messages WHERE (sender_id=$1 AND receiver_id=$2) OR (sender_id=$2 AND receiver_id=$1) ORDER BY created_at',
        [authUser.id, otherUserId]
      ),
      pool.query(
        'SELECT id, username, display_name, profile_pic FROM users WHERE id = $1',
        [otherUserId]
      ),
    ]);

    return NextResponse.json({ messages: result.rows, user: chatUser.rows[0] ?? null });
  } catch (error) {
    console.error('Messages fetch error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, context: { params: Promise<{ userId: string }> }) {
  try {
    const authUser = authenticate(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await context.params;
    const otherUserId = Number(userId);
    const { content, image_url, media_type } = await req.json();

    if (!content && !image_url) {
      return NextResponse.json({ error: 'Message must have content or media' }, { status: 400 });
    }

    const blocked = await pool.query(
      'SELECT 1 FROM blocks WHERE (blocker_id=$1 AND blocked_id=$2) OR (blocker_id=$2 AND blocked_id=$1)',
      [authUser.id, otherUserId]
    );

    if (blocked.rows.length > 0) {
      return NextResponse.json({ error: 'Message access blocked' }, { status: 403 });
    }

    const type = media_type === 'video' ? 'video' : 'image';

    await pool.query(
      'INSERT INTO messages (sender_id, receiver_id, content, image_url, media_type) VALUES ($1, $2, $3, $4, $5)',
      [authUser.id, otherUserId, content || null, image_url || null, type]
    );

    return NextResponse.json({ message: 'Message sent' });
  } catch (error) {
    console.error('Message send error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}