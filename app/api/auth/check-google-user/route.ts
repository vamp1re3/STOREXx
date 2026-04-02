import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../../lib/db';

export async function POST(request: NextRequest) {
  try {
    const { googleId, email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Check if user exists with this email
    const { rows } = await pool.query(
      'SELECT id, username, display_name, profile_pic, google_id FROM users WHERE email = $1',
      [email]
    );

    if (rows.length > 0) {
      const user = rows[0];
      // If user exists but doesn't have Google ID, update it
      if (!user.google_id && googleId) {
        await pool.query(
          'UPDATE users SET google_id = $1 WHERE id = $2',
          [googleId, user.id]
        );
      }
      return NextResponse.json({ user });
    }

    return NextResponse.json({ user: null });
  } catch (error) {
    console.error('Error checking Google user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}