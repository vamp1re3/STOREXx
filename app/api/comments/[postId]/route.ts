import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../../lib/db';
import { authenticate } from '../../../../lib/auth';

export async function GET(_req: NextRequest, context: { params: Promise<{ postId: string }> }) {
  try {
    const { postId } = await context.params;
    const result = await pool.query(
      `SELECT comments.id, comments.user_id, comments.content, comments.created_at,
              users.username, users.display_name, users.profile_pic
       FROM comments
       JOIN users ON comments.user_id = users.id
       WHERE comments.post_id = $1
       ORDER BY comments.created_at ASC`,
      [postId]
    );

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Comments fetch error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, context: { params: Promise<{ postId: string }> }) {
  try {
    const authUser = authenticate(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { postId } = await context.params;
    const { content } = await req.json();
    const safeContent = String(content ?? '').trim();

    if (!safeContent) {
      return NextResponse.json({ error: 'Comment cannot be empty' }, { status: 400 });
    }

    if (safeContent.length > 500) {
      return NextResponse.json({ error: 'Comment must be 500 characters or fewer' }, { status: 400 });
    }

    const result = await pool.query(
      `INSERT INTO comments (post_id, user_id, content)
       VALUES ($1, $2, $3)
       RETURNING id, post_id, user_id, content, created_at`,
      [postId, authUser.id, safeContent]
    );

    return NextResponse.json({ success: true, comment: result.rows[0] });
  } catch (error) {
    console.error('Comment create error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
