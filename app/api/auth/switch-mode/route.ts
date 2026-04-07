import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../../lib/db';
import { authenticate } from '../../../../lib/auth';

export async function POST(req: NextRequest) {
  try {
    const authUser = authenticate(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { mode } = await req.json();

    if (!mode || !['buyer', 'seller'].includes(mode)) {
      return NextResponse.json({ error: 'Invalid mode. Must be "buyer" or "seller"' }, { status: 400 });
    }

    // Check if user has this role
    const roleCheck = await pool.query(
      'SELECT 1 FROM user_roles WHERE user_id=$1 AND role=$2',
      [authUser.id, mode]
    );

    if (roleCheck.rows.length === 0) {
      return NextResponse.json({ error: `You don't have ${mode} role. Please sign up for it first.` }, { status: 403 });
    }

    // Update current mode
    await pool.query(
      'UPDATE users SET current_mode=$1 WHERE id=$2',
      [mode, authUser.id]
    );

    return NextResponse.json({ message: `Switched to ${mode} mode`, mode });
  } catch (error) {
    console.error('Error switching mode:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}