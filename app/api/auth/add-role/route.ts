import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../../lib/db';
import { authenticate } from '../../../../lib/auth';

export async function POST(req: NextRequest) {
  try {
    const authUser = authenticate(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { role } = await req.json();

    if (!role || !['buyer', 'seller'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role. Must be "buyer" or "seller"' }, { status: 400 });
    }

    // Check if user already has this role
    const existingRole = await pool.query(
      'SELECT 1 FROM user_roles WHERE user_id=$1 AND role=$2',
      [authUser.id, role]
    );

    if (existingRole.rows.length > 0) {
      return NextResponse.json({ error: `You already have ${role} role` }, { status: 400 });
    }

    // Add the role
    await pool.query(
      'INSERT INTO user_roles (user_id, role) VALUES ($1, $2)',
      [authUser.id, role]
    );

    // If this is the first role, set it as current mode
    const roleCount = await pool.query(
      'SELECT COUNT(*) as count FROM user_roles WHERE user_id=$1',
      [authUser.id]
    );

    if (roleCount.rows[0].count === 1) {
      await pool.query(
        'UPDATE users SET current_mode=$1 WHERE id=$2',
        [role, authUser.id]
      );
    }

    return NextResponse.json({ message: `Added ${role} role successfully`, role });
  } catch (error) {
    console.error('Error adding role:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}