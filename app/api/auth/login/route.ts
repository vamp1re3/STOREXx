import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../../../../lib/db';

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    const user = await pool.query('SELECT * FROM users WHERE email=$1', [email]);
    if (user.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 400 });
    }
    const valid = await bcrypt.compare(password, user.rows[0].password);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 400 });
    }
    const token = jwt.sign({ id: user.rows[0].id }, process.env.JWT_SECRET!);
    return NextResponse.json({ token });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}