import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import pool from '../../../lib/db';

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
    const query = req.nextUrl.searchParams.get('q')?.trim() || '';

    if (!query) {
      return NextResponse.json({ users: [], posts: [], videos: [] });
    }

    // Basic sanitization and ILIKE pattern for search
    const pattern = `%${query}%`;

    const usersResult = await pool.query(
      `SELECT id, username, display_name, profile_pic
       FROM users
       WHERE username ILIKE $1 OR display_name ILIKE $1
       ORDER BY display_name ASC
       LIMIT 20`,
      [pattern]
    );

    const postsResult = await pool.query(
      `SELECT posts.*, users.username, users.display_name, users.profile_pic
       FROM posts
       JOIN users ON posts.user_id = users.id
       WHERE posts.caption ILIKE $1
         AND NOT EXISTS (SELECT 1 FROM blocks WHERE (blocker_id = $2 AND blocked_id = posts.user_id) OR (blocker_id = posts.user_id AND blocked_id = $2))
       ORDER BY posts.created_at DESC
       LIMIT 30`,
      [pattern, userId || 0]
    );

    const postsRows = postsResult.rows as Array<{ media_type?: string }>;
    const videosResult = postsRows.filter((p) => p.media_type === 'video');

    return NextResponse.json({
      users: usersResult.rows,
      posts: postsResult.rows,
      videos: videosResult,
    });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}