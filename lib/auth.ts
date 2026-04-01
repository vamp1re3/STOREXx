import jwt from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';

export interface AuthUser {
  id: number;
}

const SESSION_COOKIE = 'session_token';

export function createSessionToken(userId: number): string {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not configured');
  }

  return jwt.sign({ id: userId }, jwtSecret, { expiresIn: '7d' });
}

export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  });
}

export function authenticate(req: NextRequest): AuthUser | null {
  const authHeader = req.headers.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.replace('Bearer ', '') : null;
  const cookieToken = req.cookies.get(SESSION_COOKIE)?.value;
  const token = bearerToken || cookieToken;

  if (!token) {
    return null;
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as AuthUser;
    return decoded;
  } catch {
    return null;
  }
}