import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import pool from '../../../../lib/db';
import { createSessionToken, setSessionCookie } from '../../../../lib/auth';
import { checkRateLimit, getRequestKey } from '../../../../lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const rate = checkRateLimit(getRequestKey(req, 'login'), 10, 60_000);
    if (!rate.allowed) {
      return NextResponse.json({ error: 'Too many login attempts. Please wait a minute and try again.' }, { status: 429 });
    }

    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const user = await pool.query(
      'SELECT id, username, display_name, profile_pic, password FROM users WHERE email=$1',
      [String(email).trim().toLowerCase()]
    );

    if (user.rows.length === 0) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 400 });
    }

    const valid = await bcrypt.compare(password, user.rows[0].password);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 400 });
    }

    const token = createSessionToken(user.rows[0].id);
    const response = NextResponse.json({
      token,
      user: {
        id: user.rows[0].id,
        username: user.rows[0].username,
        display_name: user.rows[0].display_name,
        profile_pic: user.rows[0].profile_pic,
      },
    });

    setSessionCookie(response, token);
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}