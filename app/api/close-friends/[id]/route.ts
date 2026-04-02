import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const friendId = parseInt(id);
    if (isNaN(friendId)) {
      return NextResponse.json({ error: 'Invalid friend ID' }, { status: 400 });
    }

    // Verify token and get user
    const userResult = await pool.query('SELECT id FROM users WHERE id = $1', [token]);
    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = userResult.rows[0].id;

    // Delete close friend relationship (only if it belongs to the user)
    const result = await pool.query(
      'DELETE FROM close_friends WHERE id = $1 AND user_id = $2',
      [friendId, userId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Close friend not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Close friend removed successfully' });
  } catch (error) {
    console.error('Error removing close friend:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}