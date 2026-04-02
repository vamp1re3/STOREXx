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

    // Get close friends
    const closeFriends = await pool.query(`
      SELECT cf.id, cf.friend_id, u.username, u.display_name, u.profile_pic
      FROM close_friends cf
      JOIN users u ON cf.friend_id = u.id
      WHERE cf.user_id = $1
      ORDER BY cf.created_at DESC
    `, [userId]);

    return NextResponse.json(closeFriends.rows);
  } catch (error) {
    console.error('Error fetching close friends:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { friend_username } = await request.json();
    if (!friend_username) {
      return NextResponse.json({ error: 'Friend username is required' }, { status: 400 });
    }

    // Verify token and get user
    const userResult = await pool.query('SELECT id FROM users WHERE id = $1', [token]);
    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = userResult.rows[0].id;

    // Find friend by username
    const friendResult = await pool.query('SELECT id FROM users WHERE username = $1', [friend_username]);
    if (friendResult.rows.length === 0) {
      return NextResponse.json({ error: 'Friend not found' }, { status: 404 });
    }

    const friendId = friendResult.rows[0].id;

    if (userId === friendId) {
      return NextResponse.json({ error: 'Cannot add yourself as a close friend' }, { status: 400 });
    }

    // Check if already a close friend
    const existingFriend = await pool.query(
      'SELECT id FROM close_friends WHERE user_id = $1 AND friend_id = $2',
      [userId, friendId]
    );

    if (existingFriend.rows.length > 0) {
      return NextResponse.json({ error: 'User is already a close friend' }, { status: 400 });
    }

    // Add close friend
    await pool.query(
      'INSERT INTO close_friends (user_id, friend_id) VALUES ($1, $2)',
      [userId, friendId]
    );

    return NextResponse.json({ message: 'Close friend added successfully' });
  } catch (error) {
    console.error('Error adding close friend:', error);
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
    const friendId = url.searchParams.get('id');

    if (!friendId) {
      return NextResponse.json({ error: 'Friend ID is required' }, { status: 400 });
    }

    const friendIdNum = parseInt(friendId);
    if (isNaN(friendIdNum)) {
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
      [friendIdNum, userId]
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