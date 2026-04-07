import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../lib/db';
import { authenticate } from '../../../lib/auth';

export async function POST(req: NextRequest) {
  try {
    const authUser = authenticate(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { cartItemIds, shippingAddress, notes } = await req.json();

    if (!cartItemIds || !Array.isArray(cartItemIds) || cartItemIds.length === 0) {
      return NextResponse.json({ error: 'Cart item IDs are required' }, { status: 400 });
    }

    // Get cart items with product details
    const cartItems = await pool.query(`
      SELECT ci.*, p.title, p.price, p.stock, p.user_id as seller_id, u.username as seller_username
      FROM cart_items ci
      JOIN posts p ON ci.post_id = p.id
      JOIN users u ON p.user_id = u.id
      WHERE ci.id = ANY($1) AND ci.user_id = $2
    `, [cartItemIds, authUser.id]);

    if (cartItems.rows.length === 0) {
      return NextResponse.json({ error: 'No valid cart items found' }, { status: 400 });
    }

    // Validate stock and create orders
    const orders = [];
    for (const item of cartItems.rows) {
      if (item.quantity > item.stock) {
        return NextResponse.json({
          error: `Insufficient stock for ${item.title}. Available: ${item.stock}`
        }, { status: 400 });
      }

      const totalAmount = item.price * item.quantity;

      const orderResult = await pool.query(`
        INSERT INTO orders (buyer_id, seller_id, post_id, quantity, total_amount, shipping_address, notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [authUser.id, item.seller_id, item.post_id, item.quantity, totalAmount, shippingAddress || null, notes || null]);

      orders.push(orderResult.rows[0]);

      // Update product stock
      await pool.query(`
        UPDATE posts SET stock = stock - $1 WHERE id = $2
      `, [item.quantity, item.post_id]);

      // Remove from cart
      await pool.query(`
        DELETE FROM cart_items WHERE id = $1
      `, [item.id]);
    }

    return NextResponse.json({
      message: 'Orders created successfully',
      orders
    });
  } catch (error) {
    console.error('Create orders error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const authUser = authenticate(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const role = searchParams.get('role'); // 'buyer' or 'seller'

    let query = `
      SELECT o.*,
             p.title, p.image_url, p.price as unit_price,
             b.username as buyer_username, b.display_name as buyer_display_name,
             s.username as seller_username, s.display_name as seller_display_name,
             s.bank_name, s.account_holder_name, s.account_number, s.routing_number, s.bank_address
      FROM orders o
      JOIN posts p ON o.post_id = p.id
      JOIN users b ON o.buyer_id = b.id
      JOIN users s ON o.seller_id = s.id
    `;

    const params = [];
    const conditions = [];

    if (role === 'buyer') {
      conditions.push('o.buyer_id = $1');
      params.push(authUser.id);
    } else if (role === 'seller') {
      conditions.push('o.seller_id = $1');
      params.push(authUser.id);
    } else {
      // Default to buyer's orders
      conditions.push('o.buyer_id = $1');
      params.push(authUser.id);
    }

    if (status) {
      conditions.push('o.status = $' + (params.length + 1));
      params.push(status);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY o.created_at DESC';

    const result = await pool.query(query, params);

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Get orders error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}