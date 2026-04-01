import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../../lib/db';
import { authenticate } from '../../../../lib/auth';

export async function GET(req: NextRequest, context: { params: Promise<{ userId: string }> }) {
  try {
    const authUser = authenticate(req);
    const currentUserId = authUser?.id ?? null;
    const { userId } = await context.params;
    const targetUserId = Number(userId);

    const user = await pool.query(
      'SELECT id, username, display_name, bio, is_private, profile_pic, created_at FROM users WHERE id=$1',
      [targetUserId]
    );

    if (user.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const [followers, following, followersList, followingList] = await Promise.all([
      pool.query('SELECT COUNT(*)::int AS count FROM follows WHERE following_id=$1', [targetUserId]),
      pool.query('SELECT COUNT(*)::int AS count FROM follows WHERE follower_id=$1', [targetUserId]),
      pool.query(
        `SELECT users.id, users.username, users.display_name, users.profile_pic
         FROM follows
         JOIN users ON follows.follower_id = users.id
         WHERE follows.following_id = $1
         ORDER BY users.display_name ASC NULLS LAST, users.username ASC
         LIMIT 50`,
        [targetUserId]
      ),
      pool.query(
        `SELECT users.id, users.username, users.display_name, users.profile_pic
         FROM follows
         JOIN users ON follows.following_id = users.id
         WHERE follows.follower_id = $1
         ORDER BY users.display_name ASC NULLS LAST, users.username ASC
         LIMIT 50`,
        [targetUserId]
      ),
    ]);

    let isFollowing = false;
    let isBlocked = false;
    let isBlocker = false;

    if (currentUserId) {
      const [followCheck, blockCheck, blockerCheck] = await Promise.all([
        pool.query('SELECT 1 FROM follows WHERE follower_id=$1 AND following_id=$2', [currentUserId, targetUserId]),
        pool.query('SELECT 1 FROM blocks WHERE blocker_id=$1 AND blocked_id=$2', [currentUserId, targetUserId]),
        pool.query('SELECT 1 FROM blocks WHERE blocker_id=$1 AND blocked_id=$2', [targetUserId, currentUserId]),
      ]);

      isFollowing = followCheck.rows.length > 0;
      isBlocked = blockCheck.rows.length > 0;
      isBlocker = blockerCheck.rows.length > 0;
    }

    const isOwner = currentUserId === targetUserId;
    const canViewPosts = !user.rows[0].is_private || isOwner || isFollowing;

    const posts = isBlocked || isBlocker || !canViewPosts
      ? { rows: [] }
      : await pool.query('SELECT * FROM posts WHERE user_id=$1 ORDER BY created_at DESC', [targetUserId]);

    return NextResponse.json({
      user: user.rows[0],
      posts: posts.rows,
      followers: followers.rows[0].count,
      following: following.rows[0].count,
      followersList: followersList.rows,
      followingList: followingList.rows,
      isFollowing,
      isBlocked,
      isBlockedBy: isBlocker,
      canViewPosts,
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}