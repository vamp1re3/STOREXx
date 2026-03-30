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

export async function POST(req: NextRequest, context: { params: Promise<{ userId: string }> }) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { userId: targetId } = await context.params;
    if (Number(targetId) === userId) {
      return NextResponse.json({ error: 'Cannot block yourself' }, { status: 400 });
    }

    await pool.query(
      'INSERT INTO blocks (blocker_id, blocked_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [userId, targetId]
    );

    return NextResponse.json({ success: true, message: 'User blocked' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ userId: string }> }) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { userId: targetId } = await context.params;

    await pool.query('DELETE FROM blocks WHERE blocker_id=$1 AND blocked_id=$2', [userId, targetId]);

    return NextResponse.json({ success: true, message: 'User unblocked' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}