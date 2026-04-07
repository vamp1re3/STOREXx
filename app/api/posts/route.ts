import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../lib/db';
import { authenticate } from '../../../lib/auth';

export async function GET(req: NextRequest) {
  try {
    const authUser = authenticate(req);
    const userId = authUser?.id ?? null;

    if (!userId) {
      return NextResponse.json([], { status: 200 });
    }

    const result = await pool.query(
      `SELECT posts.*, users.username, users.display_name, users.profile_pic,
              (SELECT COUNT(*)::int FROM likes WHERE likes.post_id = posts.id) AS like_count,
              (SELECT COUNT(*)::int FROM comments WHERE comments.post_id = posts.id) AS comment_count,
              CASE WHEN EXISTS(
                SELECT 1 FROM likes WHERE likes.post_id = posts.id AND likes.user_id = $1
              ) THEN true ELSE false END AS is_liked,
              CASE WHEN EXISTS(
                SELECT 1 FROM bookmarks WHERE bookmarks.post_id = posts.id AND bookmarks.user_id = $1
              ) THEN true ELSE false END AS is_bookmarked
       FROM posts
       JOIN users ON posts.user_id = users.id
       WHERE posts.is_visible = true
         AND NOT EXISTS(
           SELECT 1 FROM blocks
           WHERE (blocker_id = $1 AND blocked_id = posts.user_id)
              OR (blocker_id = posts.user_id AND blocked_id = $1)
         )
         AND (
           COALESCE(users.is_private, false) = false
           OR users.id = $1
           OR EXISTS (
             SELECT 1 FROM follows WHERE follower_id = $1 AND following_id = users.id
           )
         )
       ORDER BY posts.created_at DESC`,
      [userId]
    );

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Posts fetch error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = authenticate(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { image_url, title, description, price, condition, stock, discount_percent, media_type } = await req.json();
    if (!image_url || !title) {
      return NextResponse.json({ error: 'Image URL and title are required' }, { status: 400 });
    }

    const type = media_type === 'video' ? 'video' : 'image';
    await pool.query(
      `INSERT INTO posts (user_id, image_url, media_type, title, description, price, condition, stock, discount_percent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [authUser.id, image_url, type, String(title).trim(), description || '', Number(price) || 0, condition || 'new', Number(stock) || 1, Number(discount_percent) || 0]
    );

    return NextResponse.json({ message: 'Posted' });
  } catch (error) {
    console.error('Post create error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}