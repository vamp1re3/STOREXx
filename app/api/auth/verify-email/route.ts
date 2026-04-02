import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '../../../../lib/auth';
import pool from '../../../../lib/db';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const user = authenticate(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');

    // Store verification token (expires in 24 hours)
    await pool.query(`
      UPDATE users
      SET email_verification_token = $1, email_verification_expires = NOW() + INTERVAL '24 hours'
      WHERE id = $2
    `, [verificationToken, user.id]);

    // In a real implementation, you would send an email here
    // For now, we'll just return the token for testing
    const verificationUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/api/auth/verify-email/${verificationToken}`;

    return NextResponse.json({
      message: 'Verification email sent',
      verificationUrl // Remove this in production
    });
  } catch (error) {
    console.error('Error sending verification email:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}