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

export async function POST(req: NextRequest, context: { params: Promise<{ postId: string }> }) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { postId } = await context.params;
    const exists = await pool.query(
      'SELECT * FROM likes WHERE user_id=$1 AND post_id=$2',
      [userId, postId]
    );
    if (exists.rows.length === 0) {
      await pool.query(
        'INSERT INTO likes (user_id, post_id) VALUES ($1, $2)',
        [userId, postId]
      );
    } else {
      await pool.query(
        'DELETE FROM likes WHERE user_id=$1 AND post_id=$2',
        [userId, postId]
      );
    }
    return NextResponse.json({ message: 'Toggled like' });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}