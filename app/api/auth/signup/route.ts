import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import pool from '../../../../lib/db';

export async function POST(req: NextRequest) {
  try {
    const { username, display_name, email, password, profile_pic } = await req.json();
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO users (username, display_name, email, password, profile_pic) VALUES ($1, $2, $3, $4, $5)',
      [username, display_name || username, email, hashedPassword, profile_pic]
    );
    return NextResponse.json({ message: 'User created' });
  } catch {
    return NextResponse.json({ error: 'User already exists' }, { status: 400 });
  }
}