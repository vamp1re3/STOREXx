import { NextRequest, NextResponse } from 'next/server';
import { authenticate } from '../../../../lib/auth';
import pool from '../../../../lib/db';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ storyId: string }> }
) {
  try {
    const user = authenticate(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { storyId } = await params;
    const storyIdNum = parseInt(storyId);
    if (isNaN(storyIdNum)) {
      return NextResponse.json({ error: 'Invalid story ID' }, { status: 400 });
    }

    // Check if the story belongs to the user
    const { rows: storyRows } = await pool.query(
      'SELECT user_id FROM stories WHERE id = $1',
      [storyIdNum]
    );

    if (storyRows.length === 0) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }

    if (storyRows[0].user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Soft delete by archiving
    await pool.query(
      'UPDATE stories SET archived = true WHERE id = $1',
      [storyId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting story:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}