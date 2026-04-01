import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../../lib/db';
import { authenticate } from '../../../../lib/auth';

export async function POST(req: NextRequest, context: { params: Promise<{ userId: string }> }) {
  try {
    const authUser = authenticate(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId } = await context.params;
    const targetUserId = Number(userId);

    if (targetUserId === authUser.id) {
      return NextResponse.json({ error: 'You cannot follow yourself' }, { status: 400 });
    }

    const exists = await pool.query(
      'SELECT 1 FROM follows WHERE follower_id=$1 AND following_id=$2',
      [authUser.id, targetUserId]
    );

    if (exists.rows.length === 0) {
      await pool.query('INSERT INTO follows (follower_id, following_id) VALUES ($1, $2)', [authUser.id, targetUserId]);
    } else {
      await pool.query('DELETE FROM follows WHERE follower_id=$1 AND following_id=$2', [authUser.id, targetUserId]);
    }

    return NextResponse.json({ message: 'Toggled follow' });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}