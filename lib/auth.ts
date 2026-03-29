import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

export interface AuthUser {
  id: number;
}

export function authenticate(req: NextRequest): AuthUser | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return null;
  try {
    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as AuthUser;
    return decoded;
  } catch {
    return null;
  }
}