import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../../lib/db';
import { authenticate } from '../../../../lib/auth';

export async function POST(req: NextRequest, context: { params: Promise<{ userId: string }> }) {
  try {
    const authUser = authenticate(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId: targetId } = await context.params;
    if (Number(targetId) === authUser.id) {
      return NextResponse.json({ error: 'Cannot block yourself' }, { status: 400 });
    }

    await pool.query(
      'INSERT INTO blocks (blocker_id, blocked_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [authUser.id, targetId]
    );

    return NextResponse.json({ success: true, message: 'User blocked' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ userId: string }> }) {
  try {
    const authUser = authenticate(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { userId: targetId } = await context.params;
    await pool.query('DELETE FROM blocks WHERE blocker_id=$1 AND blocked_id=$2', [authUser.id, targetId]);

    return NextResponse.json({ success: true, message: 'User unblocked' });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}