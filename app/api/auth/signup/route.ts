import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import pool from '../../../../lib/db';
import { createSessionToken, setSessionCookie } from '../../../../lib/auth';
import { checkRateLimit, getRequestKey } from '../../../../lib/rate-limit';

export async function POST(req: NextRequest) {
  try {
    const rate = checkRateLimit(getRequestKey(req, 'signup'), 6, 60_000);
    if (!rate.allowed) {
      return NextResponse.json({ error: 'Too many signup attempts. Please wait a minute and try again.' }, { status: 429 });
    }

    const { username, display_name, email, password, profile_pic, is_seller } = await req.json();

    if (!username || !email || !password) {
      return NextResponse.json({ error: 'Username, email, and password are required' }, { status: 400 });
    }

    if (String(password).length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (username, display_name, email, password, profile_pic, is_seller)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, username, display_name, profile_pic, is_seller`,
      [String(username).trim(), display_name || username, String(email).trim().toLowerCase(), hashedPassword, profile_pic || null, Boolean(is_seller)]
    );

    const createdUser = result.rows[0];
    const token = createSessionToken(createdUser.id);
    const response = NextResponse.json({
      message: 'User created',
      token,
      user: createdUser,
    });

    setSessionCookie(response, token);
    return response;
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'User already exists or the provided data is invalid' }, { status: 400 });
  }
}