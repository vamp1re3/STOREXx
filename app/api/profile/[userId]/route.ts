import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import pool from '../../../../lib/db';

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

export async function GET(req: NextRequest, context: { params: Promise<{ userId: string }> }) {
  try {
    const currentUserId = getUserId(req);
    const { userId } = await context.params;
    const user = await pool.query(
      'SELECT id, username, display_name, profile_pic, created_at FROM users WHERE id=$1',
      [userId]
    );
    if (user.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const posts = await pool.query(
      'SELECT * FROM posts WHERE user_id=$1 ORDER BY created_at DESC',
      [userId]
    );
    const followers = await pool.query(
      'SELECT COUNT(*) FROM follows WHERE following_id=$1',
      [userId]
    );
    const following = await pool.query(
      'SELECT COUNT(*) FROM follows WHERE follower_id=$1',
      [userId]
    );
    let isFollowing = false;
    let isBlocked = false;
    let isBlocker = false;

    if (currentUserId) {
      const followCheck = await pool.query(
        'SELECT * FROM follows WHERE follower_id=$1 AND following_id=$2',
        [currentUserId, userId]
      );
      isFollowing = followCheck.rows.length > 0;

      const blockCheck = await pool.query(
        'SELECT * FROM blocks WHERE blocker_id=$1 AND blocked_id=$2',
        [currentUserId, userId]
      );
      const blockerCheck = await pool.query(
        'SELECT * FROM blocks WHERE blocker_id=$1 AND blocked_id=$2',
        [userId, currentUserId]
      );

      isBlocked = blockCheck.rows.length > 0;
      isBlocker = blockerCheck.rows.length > 0;
    }

    const safePosts = isBlocked || isBlocker ? [] : posts.rows;

    return NextResponse.json({
      user: user.rows[0],
      posts: safePosts,
      followers: followers.rows[0].count,
      following: following.rows[0].count,
      isFollowing,
      isBlocked,
      isBlockedBy: isBlocker,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}