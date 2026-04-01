import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../../lib/db';
import { authenticate } from '../../../../lib/auth';

export async function POST(req: NextRequest, context: { params: Promise<{ postId: string }> }) {
  try {
    const authUser = authenticate(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { postId } = await context.params;
    const exists = await pool.query('SELECT 1 FROM bookmarks WHERE user_id = $1 AND post_id = $2', [authUser.id, postId]);

    if (exists.rows.length === 0) {
      await pool.query('INSERT INTO bookmarks (user_id, post_id) VALUES ($1, $2)', [authUser.id, postId]);
      return NextResponse.json({ success: true, saved: true });
    }

    await pool.query('DELETE FROM bookmarks WHERE user_id = $1 AND post_id = $2', [authUser.id, postId]);
    return NextResponse.json({ success: true, saved: false });
  } catch (error) {
    console.error('Bookmark toggle error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
