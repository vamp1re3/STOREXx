import { NextRequest, NextResponse } from 'next/server';
import pool from '../../../../lib/db';
import { authenticate } from '../../../../lib/auth';

export async function PUT(req: NextRequest) {
  try {
    const authUser = authenticate(req);
    if (!authUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orderId, action, paymentReceiptUrl, shippingAddress, notes } = await req.json();

    if (!orderId || !action) {
      return NextResponse.json({ error: 'Order ID and action are required' }, { status: 400 });
    }

    // Get the order to verify ownership
    const orderResult = await pool.query(`
      SELECT * FROM orders WHERE id = $1
    `, [orderId]);

    if (orderResult.rows.length === 0) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const order = orderResult.rows[0];

    // Check permissions based on action
    if (action === 'upload_receipt' && order.buyer_id !== authUser.id) {
      return NextResponse.json({ error: 'Only the buyer can upload payment receipts' }, { status: 403 });
    }

    if (action === 'mark_paid' && order.seller_id !== authUser.id) {
      return NextResponse.json({ error: 'Only the seller can mark orders as paid' }, { status: 403 });
    }

    if (action === 'mark_shipped' && order.seller_id !== authUser.id) {
      return NextResponse.json({ error: 'Only the seller can mark orders as shipped' }, { status: 403 });
    }

    if (action === 'mark_delivered' && order.buyer_id !== authUser.id) {
      return NextResponse.json({ error: 'Only the buyer can mark orders as delivered' }, { status: 403 });
    }

    let updateQuery = '';
    let updateParams = [];

    switch (action) {
      case 'upload_receipt':
        updateQuery = 'UPDATE orders SET payment_receipt_url = $1 WHERE id = $2';
        updateParams = [paymentReceiptUrl, orderId];
        break;

      case 'mark_paid':
        updateQuery = 'UPDATE orders SET status = $1, paid_at = CURRENT_TIMESTAMP WHERE id = $2';
        updateParams = ['paid', orderId];
        break;

      case 'mark_shipped':
        updateQuery = 'UPDATE orders SET status = $1, shipped_at = CURRENT_TIMESTAMP WHERE id = $2';
        updateParams = ['shipped', orderId];
        break;

      case 'mark_delivered':
        updateQuery = 'UPDATE orders SET status = $1, delivered_at = CURRENT_TIMESTAMP WHERE id = $2';
        updateParams = ['delivered', orderId];
        break;

      case 'update_shipping':
        updateQuery = 'UPDATE orders SET shipping_address = $1, notes = $2 WHERE id = $3';
        updateParams = [shippingAddress, notes, orderId];
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    await pool.query(updateQuery, updateParams);

    return NextResponse.json({ message: `Order ${action} successfully` });
  } catch (error) {
    console.error('Update order error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}