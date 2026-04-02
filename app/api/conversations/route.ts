import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify token and get user
    const userResult = await pool.query('SELECT id FROM users WHERE id = $1', [token]);
    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = userResult.rows[0].id;

    // Get conversations with settings
    const conversations = await pool.query(`
      SELECT
        c.id,
        CASE WHEN c.user_id = $1 THEN c.other_user_id ELSE c.user_id END as other_user_id,
        u.username,
        u.display_name,
        u.profile_pic,
        c.muted,
        c.theme,
        c.background
      FROM conversations c
      JOIN users u ON (CASE WHEN c.user_id = $1 THEN c.other_user_id ELSE c.user_id END) = u.id
      WHERE (c.user_id = $1 OR c.other_user_id = $1) AND c.archived = false
      ORDER BY c.id DESC
    `, [userId]);

    return NextResponse.json(conversations.rows);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}