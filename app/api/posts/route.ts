import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import pool from '../../../lib/db.ts';

function getUserId(req: NextRequest): number | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return null;
  try {
    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: number };
    return decoded.id;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const userId = getUserId(req);
    const result = await pool.query(`
      SELECT posts.*, users.username, users.profile_pic,
      (SELECT COUNT(*) FROM likes WHERE likes.post_id = posts.id) as like_count,
      CASE WHEN $1 IS NOT NULL AND EXISTS(SELECT 1 FROM likes WHERE likes.post_id = posts.id AND likes.user_id = $1) THEN true ELSE false END as is_liked
      FROM posts
      JOIN users ON posts.user_id = users.id
      ORDER BY posts.created_at DESC
    `, [userId]);
    return NextResponse.json(result.rows);
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { image_url, caption } = await req.json();
    await pool.query(
      'INSERT INTO posts (user_id, image_url, caption) VALUES ($1, $2, $3)',
      [userId, image_url, caption]
    );
    return NextResponse.json({ message: 'Posted' });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}