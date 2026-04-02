import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '../../../lib/auth';
import pool from '../../../lib/db';

export async function GET(request: NextRequest) {
  try {
    const user = authenticate(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'posts', 'stories', 'chats'

    let query = '';
    let params = [user.id];

    switch (type) {
      case 'posts':
        query = `
          SELECT p.*, u.username, u.display_name, u.profile_pic
          FROM posts p
          JOIN users u ON p.user_id = u.id
          WHERE p.user_id = $1 AND p.archived = true
          ORDER BY p.created_at DESC
        `;
        break;

      case 'stories':
        query = `
          SELECT s.*, u.username, u.display_name, u.profile_pic
          FROM stories s
          JOIN users u ON s.user_id = u.id
          WHERE s.user_id = $1 AND s.archived = true
          ORDER BY s.created_at DESC
        `;
        break;

      case 'chats':
        query = `
          SELECT
            c.*,
            u.username,
            u.display_name,
            u.profile_pic,
            m.content as last_message,
            m.created_at as last_message_time
          FROM conversations c
          JOIN users u ON (c.other_user_id = u.id)
          LEFT JOIN messages m ON m.id = (
            SELECT id FROM messages
            WHERE (sender_id = c.user_id AND receiver_id = c.other_user_id)
               OR (sender_id = c.other_user_id AND receiver_id = c.user_id)
            ORDER BY created_at DESC LIMIT 1
          )
          WHERE c.user_id = $1 AND c.archived = true
          ORDER BY m.created_at DESC NULLS LAST
        `;
        break;

      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    const { rows } = await pool.query(query, params);
    return NextResponse.json({ archives: rows });
  } catch (error) {
    console.error('Error fetching archives:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = authenticate(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type, id, action } = await request.json(); // action: 'archive' or 'unarchive'

    if (!type || !id || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!['archive', 'unarchive'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    const archived = action === 'archive';
    let query = '';
    let params: any[] = [];

    switch (type) {
      case 'posts':
        query = 'UPDATE posts SET archived = $1 WHERE id = $2 AND user_id = $3';
        params = [archived, id, user.id];
        break;

      case 'stories':
        query = 'UPDATE stories SET archived = $1 WHERE id = $2 AND user_id = $3';
        params = [archived, id, user.id];
        break;

      case 'chats':
        query = 'UPDATE conversations SET archived = $1 WHERE id = $2 AND user_id = $3';
        params = [archived, id, user.id];
        break;

      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    const result = await pool.query(query, params);

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Item not found or access denied' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating archive status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}