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

    const { username, display_name, email, password, profile_pic, roles, bank_name, account_holder_name, account_number, routing_number, bank_address } = await req.json();

    if (!username || !email || !password) {
      return NextResponse.json({ error: 'Username, email, and password are required' }, { status: 400 });
    }

    if (String(password).length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long' }, { status: 400 });
    }

    // Validate roles
    const validRoles = ['buyer', 'seller'];
    const userRoles = Array.isArray(roles) ? roles.filter(r => validRoles.includes(r)) : ['buyer'];
    if (userRoles.length === 0) {
      userRoles.push('buyer'); // Default to buyer
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO users (username, display_name, email, password, profile_pic, current_mode, bank_name, account_holder_name, account_number, routing_number, bank_address)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING id, username, display_name, profile_pic, current_mode`,
      [String(username).trim(), display_name || username, String(email).trim().toLowerCase(), hashedPassword, profile_pic || null, userRoles[0], bank_name || null, account_holder_name || null, account_number || null, routing_number || null, bank_address || null]
    );

    const createdUser = result.rows[0];

    // Insert user roles
    for (const role of userRoles) {
      await pool.query(
        `INSERT INTO user_roles (user_id, role) VALUES ($1, $2)`,
        [createdUser.id, role]
      );
    }

    const token = createSessionToken(createdUser.id);
    const response = NextResponse.json({
      message: 'User created',
      token,
      user: { ...createdUser, roles: userRoles },
    });

    setSessionCookie(response, token);
    return response;
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'User already exists or the provided data is invalid' }, { status: 400 });
  }
}