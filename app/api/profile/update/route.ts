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

export async function PUT(req: NextRequest) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { display_name, profile_pic } = await req.json();

    // Validate input
    if (display_name !== undefined && (typeof display_name !== 'string' || display_name.length > 100)) {
      return NextResponse.json({ error: 'Invalid display name' }, { status: 400 });
    }

    if (profile_pic !== undefined && (typeof profile_pic !== 'string' || profile_pic.length > 255)) {
      return NextResponse.json({ error: 'Invalid profile picture URL' }, { status: 400 });
    }

    // Update user profile
    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;

    if (display_name !== undefined) {
      updateFields.push(`display_name = $${paramCount++}`);
      updateValues.push(display_name);
    }

    if (profile_pic !== undefined) {
      updateFields.push(`profile_pic = $${paramCount++}`);
      updateValues.push(profile_pic);
    }

    if (updateFields.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    updateValues.push(userId);

    const query = `
      UPDATE users
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, username, display_name, profile_pic
    `;

    const result = await pool.query(query, updateValues);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      user: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}