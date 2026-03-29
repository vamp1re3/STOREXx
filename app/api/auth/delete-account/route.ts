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

export async function DELETE(req: NextRequest) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Start a transaction to delete all user data
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Delete user's messages
      await client.query('DELETE FROM messages WHERE sender_id = $1 OR receiver_id = $1', [userId]);

      // Delete user's likes
      await client.query('DELETE FROM likes WHERE user_id = $1', [userId]);

      // Delete user's follows (both following and followers)
      await client.query('DELETE FROM follows WHERE follower_id = $1 OR following_id = $1', [userId]);

      // Delete user's posts
      await client.query('DELETE FROM posts WHERE user_id = $1', [userId]);

      // Finally, delete the user
      const result = await client.query('DELETE FROM users WHERE id = $1', [userId]);

      if (result.rowCount === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      await client.query('COMMIT');

      return NextResponse.json({ success: true, message: 'Account deleted successfully' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error deleting account:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}