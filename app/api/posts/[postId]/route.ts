import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../../lib/db';
import { authenticate } from '../../../../lib/auth';

export async function DELETE(req: NextRequest, context: { params: Promise<{ postId: string }> }) {
  try {
    const authUser = authenticate(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { postId } = await context.params;
    const existing = await pool.query('SELECT user_id FROM posts WHERE id = $1', [postId]);

    if (existing.rows.length === 0) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    if (Number(existing.rows[0].user_id) !== authUser.id) {
      return NextResponse.json({ error: 'You can only delete your own posts' }, { status: 403 });
    }

    await pool.query('DELETE FROM posts WHERE id = $1', [postId]);
    return NextResponse.json({ success: true, message: 'Post deleted' });
  } catch (error) {
    console.error('Delete post error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
