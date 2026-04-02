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

    // Get blocked users
    const blocks = await pool.query(`
      SELECT b.id, b.blocked_id, u.username, u.display_name
      FROM blocks b
      JOIN users u ON b.blocked_id = u.id
      WHERE b.blocker_id = $1
      ORDER BY b.created_at DESC
    `, [userId]);

    return NextResponse.json(blocks.rows);
  } catch (error) {
    console.error('Error fetching blocks:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { username } = await request.json();
    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
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
      return NextResponse.json({ error: 'Cannot block yourself' }, { status: 400 });
    }

    // Check if already blocked
    const existing = await pool.query(
      'SELECT id FROM blocks WHERE blocker_id = $1 AND blocked_id = $2',
      [userId, targetUserId]
    );

    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'User already blocked' }, { status: 400 });
    }

    // Add block
    await pool.query(
      'INSERT INTO blocks (blocker_id, blocked_id) VALUES ($1, $2)',
      [userId, targetUserId]
    );

    return NextResponse.json({ message: 'User blocked successfully' });
  } catch (error) {
    console.error('Error blocking user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const blockId = url.searchParams.get('id');

    if (!blockId) {
      return NextResponse.json({ error: 'Block ID is required' }, { status: 400 });
    }

    const blockIdNum = parseInt(blockId);
    if (isNaN(blockIdNum)) {
      return NextResponse.json({ error: 'Invalid block ID' }, { status: 400 });
    }

    // Verify token and get user
    const userResult = await pool.query('SELECT id FROM users WHERE id = $1', [token]);
    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = userResult.rows[0].id;

    // Delete block (only if it belongs to the user)
    const result = await pool.query(
      'DELETE FROM blocks WHERE id = $1 AND blocker_id = $2',
      [blockIdNum, userId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Block not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Block removed successfully' });
  } catch (error) {
    console.error('Error removing block:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}