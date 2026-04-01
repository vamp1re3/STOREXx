import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../../lib/db';
import { authenticate, clearSessionCookie } from '../../../../lib/auth';

export async function DELETE(req: NextRequest) {
  try {
    const authUser = authenticate(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM messages WHERE sender_id = $1 OR receiver_id = $1', [authUser.id]);
      await client.query('DELETE FROM likes WHERE user_id = $1', [authUser.id]);
      await client.query('DELETE FROM follows WHERE follower_id = $1 OR following_id = $1', [authUser.id]);
      await client.query('DELETE FROM bookmarks WHERE user_id = $1', [authUser.id]);
      await client.query('DELETE FROM comments WHERE user_id = $1', [authUser.id]);
      await client.query('DELETE FROM posts WHERE user_id = $1', [authUser.id]);

      const result = await client.query('DELETE FROM users WHERE id = $1', [authUser.id]);

      if (result.rowCount === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      await client.query('COMMIT');

      const response = NextResponse.json({ success: true, message: 'Account deleted successfully' });
      clearSessionCookie(response);
      return response;
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