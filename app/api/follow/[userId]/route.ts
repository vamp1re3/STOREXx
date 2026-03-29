import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import pool from '../../../../lib/db.ts';

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

export async function POST(req: NextRequest, { params }: { params: { userId: string } }) {
  try {
    const currentUserId = getUserId(req);
    if (!currentUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { userId } = params;
    const exists = await pool.query(
      'SELECT * FROM follows WHERE follower_id=$1 AND following_id=$2',
      [currentUserId, userId]
    );
    if (exists.rows.length === 0) {
      await pool.query(
        'INSERT INTO follows (follower_id, following_id) VALUES ($1, $2)',
        [currentUserId, userId]
      );
    } else {
      await pool.query(
        'DELETE FROM follows WHERE follower_id=$1 AND following_id=$2',
        [currentUserId, userId]
      );
    }
    return NextResponse.json({ message: 'Toggled follow' });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}