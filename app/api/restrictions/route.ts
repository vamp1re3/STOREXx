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

    // Get restricted users
    const restrictions = await pool.query(`
      SELECT r.id, r.restricted_id, u.username, u.display_name
      FROM restrictions r
      JOIN users u ON r.restricted_id = u.id
      WHERE r.restrictor_id = $1
      ORDER BY r.created_at DESC
    `, [userId]);

    return NextResponse.json(restrictions.rows);
  } catch (error) {
    console.error('Error fetching restrictions:', error);
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
      return NextResponse.json({ error: 'Cannot restrict yourself' }, { status: 400 });
    }

    // Check if already restricted
    const existing = await pool.query(
      'SELECT id FROM restrictions WHERE restrictor_id = $1 AND restricted_id = $2',
      [userId, targetUserId]
    );

    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'User already restricted' }, { status: 400 });
    }

    // Add restriction
    await pool.query(
      'INSERT INTO restrictions (restrictor_id, restricted_id) VALUES ($1, $2)',
      [userId, targetUserId]
    );

    return NextResponse.json({ message: 'User restricted successfully' });
  } catch (error) {
    console.error('Error restricting user:', error);
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
    const restrictionId = url.searchParams.get('id');

    if (!restrictionId) {
      return NextResponse.json({ error: 'Restriction ID is required' }, { status: 400 });
    }

    const restrictionIdNum = parseInt(restrictionId);
    if (isNaN(restrictionIdNum)) {
      return NextResponse.json({ error: 'Invalid restriction ID' }, { status: 400 });
    }

    // Verify token and get user
    const userResult = await pool.query('SELECT id FROM users WHERE id = $1', [token]);
    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = userResult.rows[0].id;

    // Delete restriction (only if it belongs to the user)
    const result = await pool.query(
      'DELETE FROM restrictions WHERE id = $1 AND restrictor_id = $2',
      [restrictionIdNum, userId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Restriction not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Restriction removed successfully' });
  } catch (error) {
    console.error('Error removing restriction:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}