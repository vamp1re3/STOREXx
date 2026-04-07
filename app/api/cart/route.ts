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
      `SELECT cart_items.id AS cart_item_id,
              cart_items.quantity,
              posts.id AS post_id,
              posts.title,
              posts.description,
              posts.price,
              posts.discount_percent,
              posts.stock,
              posts.image_url,
              posts.media_type,
              posts.user_id AS seller_id,
              users.username AS seller_username,
              users.display_name AS seller_display_name,
              users.profile_pic AS seller_profile_pic
       FROM cart_items
       JOIN posts ON cart_items.post_id = posts.id
       JOIN users ON posts.user_id = users.id
       WHERE cart_items.user_id = $1
         AND posts.is_visible = true
       ORDER BY cart_items.created_at DESC`,
      [authUser.id]
    );

    const cartItems = result.rows.map((item) => ({
      ...item,
      price: parseFloat(item.price),
      discount_percent: Number(item.discount_percent),
      quantity: Number(item.quantity),
      stock: Number(item.stock),
      total_price: Number(item.price) * Number(item.quantity),
      discounted_price: Number(item.price) * (1 - Number(item.discount_percent) / 100),
    }));

    const subtotal = cartItems.reduce((sum, item) => sum + item.total_price, 0);
    const total = cartItems.reduce((sum, item) => sum + item.discounted_price * item.quantity, 0);

    return NextResponse.json({ cartItems, subtotal, total });
  } catch (error) {
    console.error('Cart fetch error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authUser = authenticate(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { post_id, quantity } = await req.json();
    const postId = Number(post_id);
    const requestedQuantity = Math.max(1, Number(quantity) || 1);

    const postResult = await pool.query('SELECT id, stock, is_visible FROM posts WHERE id = $1', [postId]);
    const post = postResult.rows[0];
    if (!post || !post.is_visible) {
      return NextResponse.json({ error: 'Product not found or unavailable' }, { status: 404 });
    }

    const safeQuantity = Math.min(requestedQuantity, Number(post.stock) || 1);
    await pool.query(
      `INSERT INTO cart_items (user_id, post_id, quantity)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, post_id)
       DO UPDATE SET quantity = LEAST(cart_items.quantity + EXCLUDED.quantity,
                                      (SELECT stock FROM posts WHERE id = cart_items.post_id))`,
      [authUser.id, postId, safeQuantity]
    );

    return NextResponse.json({ message: 'Added to cart' });
  } catch (error) {
    console.error('Cart add error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const authUser = authenticate(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const postIdParam = req.nextUrl.searchParams.get('postId');
    const body = await req.json().catch(() => ({}));
    const postId = Number(body.post_id || postIdParam);

    if (!postId) {
      return NextResponse.json({ error: 'Product ID is required' }, { status: 400 });
    }

    await pool.query('DELETE FROM cart_items WHERE user_id = $1 AND post_id = $2', [authUser.id, postId]);
    return NextResponse.json({ message: 'Removed from cart' });
  } catch (error) {
    console.error('Cart delete error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
