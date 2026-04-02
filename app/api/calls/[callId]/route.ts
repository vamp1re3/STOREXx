import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '../../../../lib/auth';
import pool from '../../../../lib/db';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ callId: string }> }
) {
  try {
    const user = authenticate(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { callId } = await params;
    const callIdNum = parseInt(callId);
    if (isNaN(callIdNum)) {
      return NextResponse.json({ error: 'Invalid call ID' }, { status: 400 });
    }

    const { action } = await request.json(); // 'accept', 'reject', 'end'

    // Get call details
    const { rows: callRows } = await pool.query(
      'SELECT * FROM calls WHERE id = $1',
      [callIdNum]
    );

    if (callRows.length === 0) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 });
    }

    const call = callRows[0];

    // Check if user is part of this call
    if (call.caller_id !== user.id && call.receiver_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let newStatus = call.status;
    interface UpdateFields {
      status: string;
      started_at?: Date;
      ended_at?: Date;
    }
    let updateFields: UpdateFields = { status: newStatus };
    const now = new Date();

    switch (action) {
      case 'accept':
        if (call.receiver_id !== user.id) {
          return NextResponse.json({ error: 'Only receiver can accept' }, { status: 403 });
        }
        if (call.status !== 'pending') {
          return NextResponse.json({ error: 'Call cannot be accepted' }, { status: 400 });
        }
        newStatus = 'ongoing';
        updateFields = { status: newStatus, started_at: now };
        break;

      case 'reject':
        if (call.receiver_id !== user.id) {
          return NextResponse.json({ error: 'Only receiver can reject' }, { status: 403 });
        }
        if (call.status !== 'pending') {
          return NextResponse.json({ error: 'Call cannot be rejected' }, { status: 400 });
        }
        newStatus = 'ended';
        updateFields = { status: newStatus, ended_at: now };
        break;

      case 'end':
        if (call.status !== 'ongoing') {
          return NextResponse.json({ error: 'Call is not ongoing' }, { status: 400 });
        }
        newStatus = 'ended';
        updateFields = { status: newStatus, ended_at: now };
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Update call
    const { rows } = await pool.query(`
      UPDATE calls
      SET status = $1, started_at = $2, ended_at = $3
      WHERE id = $4
      RETURNING *
    `, [
      newStatus,
      updateFields.started_at ?? call.started_at,
      updateFields.ended_at ?? call.ended_at,
      callIdNum
    ]);

    return NextResponse.json({ call: rows[0] });
  } catch (error) {
    console.error('Error updating call:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}