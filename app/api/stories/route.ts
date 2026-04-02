import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '../../../lib/auth';
import pool from '../../../lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = authenticate(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get stories from users I follow + my own stories
    const { rows: stories } = await pool.query(`
      SELECT
        s.*,
        u.username,
        u.display_name,
        u.profile_pic,
        CASE WHEN s.user_id = $1 THEN true ELSE false END as is_own_story
      FROM stories s
      JOIN users u ON s.user_id = u.id
      WHERE (s.user_id = $1 OR s.user_id IN (
        SELECT followed_id FROM follows WHERE follower_id = $1
      ))
      AND s.expires_at > NOW()
      AND s.archived = false
      ORDER BY s.created_at DESC
    `, [user.id]);

    return NextResponse.json({ stories });
  } catch (error) {
    console.error('Error fetching stories:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = authenticate(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const content = formData.get('content') as string;
    const mediaUrl = formData.get('media_url') as string;
    const mediaType = formData.get('media_type') as string || 'image';

    if (!mediaUrl) {
      return NextResponse.json({ error: 'Media URL is required' }, { status: 400 });
    }

    // Stories expire after 24 hours
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const { rows } = await pool.query(`
      INSERT INTO stories (user_id, content, media_url, media_type, expires_at)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [user.id, content || null, mediaUrl, mediaType, expiresAt]);

    return NextResponse.json({ story: rows[0] });
  } catch (error) {
    console.error('Error creating story:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}