import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const restrictionId = parseInt(id);
    if (isNaN(restrictionId)) {
      return NextResponse.json({ error: 'Invalid restriction ID' }, { status: 400 });
    }

    // Verify token and get user
    const userResult = await pool.query('SELECT id FROM users WHERE id = $1', [token]);
    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = userResult.rows[0].id;

    // Delete restriction (only if it belongs to the user)
    const result = await pool.query(
      'DELETE FROM restrictions WHERE id = $1 AND restrictor_id = $2',
      [restrictionId, userId]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: 'Restriction not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Restriction removed successfully' });
  } catch (error) {
    console.error('Error removing restriction:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}