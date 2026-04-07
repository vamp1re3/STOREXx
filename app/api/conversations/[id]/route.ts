import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const conversationId = parseInt(id);
    if (isNaN(conversationId)) {
      return NextResponse.json({ error: 'Invalid conversation ID' }, { status: 400 });
    }

    const { muted, theme, background } = await request.json();

    // Validate inputs
    if (muted !== undefined && typeof muted !== 'boolean') {
      return NextResponse.json({ error: 'Invalid muted value' }, { status: 400 });
    }

    if (theme !== undefined && !['default', 'dark', 'blue', 'green'].includes(theme)) {
      return NextResponse.json({ error: 'Invalid theme value' }, { status: 400 });
    }

    if (background !== undefined && typeof background !== 'string') {
      return NextResponse.json({ error: 'Invalid background value' }, { status: 400 });
    }

    // Verify token and get user
    const userResult = await pool.query('SELECT id FROM users WHERE id = $1', [token]);
    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = userResult.rows[0].id;

    // Check if conversation belongs to user
    const conversation = await pool.query(
      'SELECT id FROM conversations WHERE id = $1 AND (user_id = $2 OR other_user_id = $2)',
      [conversationId, userId]
    );

    if (conversation.rows.length === 0) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Build update query dynamically
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (muted !== undefined) {
      updates.push(`muted = $${paramIndex++}`);
      values.push(muted);
    }

    if (theme !== undefined) {
      updates.push(`theme = $${paramIndex++}`);
      values.push(theme);
    }

    if (background !== undefined) {
      updates.push(`background = $${paramIndex++}`);
      values.push(background);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No valid updates provided' }, { status: 400 });
    }

    values.push(conversationId);
    const updateQuery = `UPDATE conversations SET ${updates.join(', ')} WHERE id = $${paramIndex}`;

    await pool.query(updateQuery, values);

    return NextResponse.json({ message: 'Conversation settings updated successfully' });
  } catch (error) {
    console.error('Error updating conversation settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}