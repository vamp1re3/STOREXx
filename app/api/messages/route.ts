import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../lib/db';
import { authenticate } from '../../../lib/auth';

export async function GET(req: NextRequest) {
  try {
    const authUser = authenticate(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await pool.query(
      `SELECT convo.user_id,
              convo.content,
              convo.image_url,
              convo.media_type,
              convo.created_at AS last_message_at,
              users.username,
              users.display_name,
              users.profile_pic,
              COALESCE(unread.count, 0)::int AS unread_count
       FROM (
         SELECT DISTINCT ON (partner_id)
                partner_id AS user_id,
                content,
                image_url,
                media_type,
                created_at
         FROM (
           SELECT CASE WHEN sender_id = $1 THEN receiver_id ELSE sender_id END AS partner_id,
                  content,
                  image_url,
                  media_type,
                  created_at
           FROM messages
           WHERE sender_id = $1 OR receiver_id = $1
         ) message_pairs
         ORDER BY partner_id, created_at DESC
       ) convo
       JOIN users ON users.id = convo.user_id
       LEFT JOIN (
         SELECT sender_id, COUNT(*) AS count
         FROM messages
         WHERE receiver_id = $1 AND read_at IS NULL
         GROUP BY sender_id
       ) unread ON unread.sender_id = convo.user_id
       ORDER BY convo.created_at DESC`,
      [authUser.id]
    );

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Conversation list error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
