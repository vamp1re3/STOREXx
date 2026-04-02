import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '../../../lib/auth';
import pool from '../../../lib/db';

export async function POST(request: NextRequest) {
  try {
    const user = authenticate(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { receiverId, callType } = await request.json();

    if (!receiverId || !callType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!['audio', 'video'].includes(callType)) {
      return NextResponse.json({ error: 'Invalid call type' }, { status: 400 });
    }

    // Check if receiver exists and is not blocked
    const { rows: receiverRows } = await pool.query(
      'SELECT id FROM users WHERE id = $1',
      [receiverId]
    );

    if (receiverRows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if users are blocked
    const { rows: blockRows } = await pool.query(
      'SELECT 1 FROM blocks WHERE (blocker_id = $1 AND blocked_id = $2) OR (blocker_id = $2 AND blocked_id = $1)',
      [user.id, receiverId]
    );

    if (blockRows.length > 0) {
      return NextResponse.json({ error: 'Cannot call blocked user' }, { status: 403 });
    }

    // Create call record
    const { rows } = await pool.query(`
      INSERT INTO calls (caller_id, receiver_id, call_type, status)
      VALUES ($1, $2, $3, 'pending')
      RETURNING *
    `, [user.id, receiverId, callType]);

    return NextResponse.json({ call: rows[0] });
  } catch (error) {
    console.error('Error creating call:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = authenticate(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get active calls for the user
    const { rows: calls } = await pool.query(`
      SELECT
        c.*,
        u.username,
        u.display_name,
        u.profile_pic
      FROM calls c
      JOIN users u ON (c.caller_id = u.id AND c.caller_id != $1) OR (c.receiver_id = u.id AND c.receiver_id != $1)
      WHERE (c.caller_id = $1 OR c.receiver_id = $1)
      AND c.status IN ('pending', 'ongoing')
      ORDER BY c.created_at DESC
    `, [user.id]);

    return NextResponse.json({ calls });
  } catch (error) {
    console.error('Error fetching calls:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}