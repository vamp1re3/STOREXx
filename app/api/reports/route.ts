import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { username, reason } = await request.json();
    if (!username || !reason) {
      return NextResponse.json({ error: 'Username and reason are required' }, { status: 400 });
    }

    if (reason.length > 500) {
      return NextResponse.json({ error: 'Report reason too long' }, { status: 400 });
    }

    // Verify token and get user
    const userResult = await pool.query('SELECT id FROM users WHERE id = $1', [token]);
    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = userResult.rows[0].id;

    // Find target user
    const targetUser = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    if (targetUser.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const targetUserId = targetUser.rows[0].id;

    if (userId === targetUserId) {
      return NextResponse.json({ error: 'Cannot report yourself' }, { status: 400 });
    }

    // Insert report
    await pool.query(
      'INSERT INTO reports (reporter_id, reported_user_id, reason) VALUES ($1, $2, $3)',
      [userId, targetUserId, reason]
    );

    return NextResponse.json({ message: 'Report submitted successfully' });
  } catch (error) {
    console.error('Error submitting report:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}