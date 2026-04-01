import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../../lib/db';
import { authenticate } from '../../../../lib/auth';

export async function PUT(req: NextRequest) {
  try {
    const authUser = authenticate(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { display_name, profile_pic, bio, is_private } = await req.json();

    if (display_name !== undefined && (typeof display_name !== 'string' || display_name.length > 100)) {
      return NextResponse.json({ error: 'Invalid display name' }, { status: 400 });
    }

    if (bio !== undefined && (typeof bio !== 'string' || bio.length > 280)) {
      return NextResponse.json({ error: 'Bio must be 280 characters or fewer' }, { status: 400 });
    }

    if (profile_pic !== undefined && (typeof profile_pic !== 'string' || profile_pic.length > 255)) {
      return NextResponse.json({ error: 'Invalid profile picture URL' }, { status: 400 });
    }

    if (is_private !== undefined && typeof is_private !== 'boolean') {
      return NextResponse.json({ error: 'Invalid privacy setting' }, { status: 400 });
    }

    const updateFields: string[] = [];
    const updateValues: Array<string | boolean | number | null> = [];
    let paramCount = 1;

    if (display_name !== undefined) {
      updateFields.push(`display_name = $${paramCount++}`);
      updateValues.push(display_name);
    }

    if (profile_pic !== undefined) {
      updateFields.push(`profile_pic = $${paramCount++}`);
      updateValues.push(profile_pic || null);
    }

    if (bio !== undefined) {
      updateFields.push(`bio = $${paramCount++}`);
      updateValues.push(bio);
    }

    if (is_private !== undefined) {
      updateFields.push(`is_private = $${paramCount++}`);
      updateValues.push(is_private);
    }

    if (updateFields.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    updateValues.push(authUser.id);

    const query = `
      UPDATE users
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, username, display_name, bio, is_private, profile_pic
    `;

    const result = await pool.query(query, updateValues);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, user: result.rows[0] });
  } catch (error) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}