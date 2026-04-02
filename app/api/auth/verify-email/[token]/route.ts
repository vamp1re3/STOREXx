import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../../../lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // Find user with this verification token
    const { rows } = await pool.query(`
      SELECT id FROM users
      WHERE email_verification_token = $1
      AND email_verification_expires > NOW()
    `, [token]);

    if (rows.length === 0) {
      return NextResponse.redirect(`${process.env.BASE_URL || 'http://localhost:3000'}/login?error=invalid_token`);
    }

    // Mark email as verified
    await pool.query(`
      UPDATE users
      SET email_verified = true,
          email_verification_token = NULL,
          email_verification_expires = NULL
      WHERE id = $1
    `, [rows[0].id]);

    return NextResponse.redirect(`${process.env.BASE_URL || 'http://localhost:3000'}/login?message=email_verified`);
  } catch (error) {
    console.error('Error verifying email:', error);
    return NextResponse.redirect(`${process.env.BASE_URL || 'http://localhost:3000'}/login?error=verification_failed`);
  }
}