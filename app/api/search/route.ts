import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../lib/db';
import { authenticate } from '../../../lib/auth';

export async function GET(req: NextRequest) {
  try {
    const authUser = authenticate(req);
    const userId = authUser?.id ?? 0;
    const query = req.nextUrl.searchParams.get('q')?.trim() || '';

    if (!query) {
      return NextResponse.json({ users: [], posts: [], videos: [] });
    }

    const pattern = `%${query}%`;

    const usersResult = await pool.query(
      `SELECT id, username, display_name, profile_pic
       FROM users
       WHERE (username ILIKE $1 OR display_name ILIKE $1)
         AND NOT EXISTS (
           SELECT 1 FROM blocks
           WHERE (blocker_id = $2 AND blocked_id = users.id)
              OR (blocker_id = users.id AND blocked_id = $2)
         )
       ORDER BY display_name ASC NULLS LAST, username ASC
       LIMIT 20`,
      [pattern, userId]
    );

    const postsResult = await pool.query(
      `SELECT posts.*, users.username, users.display_name, users.profile_pic
       FROM posts
       JOIN users ON posts.user_id = users.id
       WHERE posts.caption ILIKE $1
         AND NOT EXISTS (
           SELECT 1 FROM blocks
           WHERE (blocker_id = $2 AND blocked_id = posts.user_id)
              OR (blocker_id = posts.user_id AND blocked_id = $2)
         )
         AND (
           COALESCE(users.is_private, false) = false
           OR users.id = $2
           OR EXISTS (
             SELECT 1 FROM follows WHERE follower_id = $2 AND following_id = users.id
           )
         )
       ORDER BY posts.created_at DESC
       LIMIT 30`,
      [pattern, userId]
    );

    const postsRows = postsResult.rows as Array<{ media_type?: string }>;
    const videosResult = postsRows.filter((post) => post.media_type === 'video');

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