import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../../lib/db';
import { authenticate } from '../../../../lib/auth';

export async function GET(req: NextRequest) {
  try {
    const authUser = authenticate(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await pool.query(
      `SELECT sender_id, COUNT(*)::int AS count
       FROM messages
       WHERE receiver_id = $1 AND read_at IS NULL
       GROUP BY sender_id`,
      [authUser.id]
    );

    const counts = result.rows.reduce<Record<number, number>>((acc, row) => {
      acc[Number(row.sender_id)] = Number(row.count);
      return acc;
    }, {});

    return NextResponse.json({ counts });
  } catch (error) {
    console.error('Unread messages error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
