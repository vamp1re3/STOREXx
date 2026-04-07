'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FiArrowLeft, FiPackage, FiCheck, FiEye, FiHome, FiSearch, FiSettings, FiShoppingCart } from 'react-icons/fi';

interface Order {
  id: number;
  buyer_id: number;
  seller_id: number;
  post_id: number;
  quantity: number;
  total_amount: number;
  status: string;
  payment_receipt_url?: string;
  shipping_address?: string;
  notes?: string;
  paid_at?: string;
  shipped_at?: string;
  delivered_at?: string;
  created_at: string;
  title: string;
  image_url: string;
  unit_price: number;
  buyer_username: string;
  buyer_display_name: string;
  seller_username: string;
  seller_display_name: string;
}

export default function BuyerOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [userMode, setUserMode] = useState<'buyer' | 'seller'>('buyer');
  const router = useRouter();

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      const res = await fetch('/api/orders?role=buyer', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('Failed to load orders');
      }

      const data = await res.json();
      setOrders(data);

      // Load user mode for mobile nav
      try {
        const userRes = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (userRes.ok) {
          const userData = await userRes.json();
          setUserMode(userData.current_mode || 'buyer');
        }
      } catch (error) {
        console.error('Failed to get user mode:', error);
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const markAsDelivered = async (orderId: number) => {
    setUpdating(orderId);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: 'mark_delivered' }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update order');
      }

      // Update local state
      setOrders(prev => prev.map(order =>
        order.id === orderId
          ? {
              ...order,
              status: 'delivered',
              delivered_at: new Date().toISOString(),
            }
          : order
      ));

      alert('Order marked as delivered!');
    } catch (error: any) {
      alert('Failed to update order: ' + error.message);
    } finally {
      setUpdating(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'status-pending';
      case 'paid': return 'status-paid';
      case 'shipped': return 'status-shipped';
      case 'delivered': return 'status-delivered';
      default: return 'status-default';
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="card">
          <p>Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container page-with-mobile-nav">
      <div className="top-bar-row">
        <button onClick={() => router.back()} className="back-btn">
          <FiArrowLeft size={16} /> Back
        </button>
        <h1>My Orders</h1>
      </div>

      {error && <p className="error">{error}</p>}

      {orders.length === 0 ? (
        <div className="card">
          <p>You haven't placed any orders yet.</p>
        </div>
      ) : (
        <div className="orders-list">
          {orders.map((order) => (
            <div key={order.id} className="order-card">
              <div className="order-header">
                <div>
                  <h3>Order #{order.id}</h3>
                  <p className="muted-text">
                    {new Date(order.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span className={`status ${getStatusColor(order.status)}`}>
                  {order.status}
                </span>
              </div>

              <div className="order-content">
                <Image
                  src={order.image_url}
                  alt={order.title}
                  width={80}
                  height={80}
                  unoptimized
                  style={{ borderRadius: '8px', objectFit: 'cover' }}
                />

                <div className="order-details">
                  <h4>{order.title}</h4>
                  <p>Quantity: {order.quantity}</p>
                  <p>Total: ${order.total_amount.toFixed(2)}</p>
                  <p>Seller: {order.seller_display_name || order.seller_username}</p>

                  {order.shipping_address && (
                    <div className="shipping-info">
                      <strong>Shipping Address:</strong>
                      <p>{order.shipping_address}</p>
                    </div>
                  )}

                  {order.notes && (
                    <div className="notes">
                      <strong>Notes:</strong>
                      <p>{order.notes}</p>
                    </div>
                  )}
                </div>
              </div>

              {order.payment_receipt_url && (
                <div className="payment-receipt">
                  <strong>Payment Receipt:</strong>
                  <a
                    href={order.payment_receipt_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="receipt-link"
                  >
                    <FiEye size={16} /> View Receipt
                  </a>
                </div>
              )}

              <div className="order-timeline">
                <div className={`timeline-item ${order.status !== 'pending' ? 'completed' : ''}`}>
                  <FiPackage size={16} />
                  <span>Order Placed</span>
                  <small>{new Date(order.created_at).toLocaleDateString()}</small>
                </div>

                {order.paid_at && (
                  <div className={`timeline-item ${['paid', 'shipped', 'delivered'].includes(order.status) ? 'completed' : ''}`}>
                    <FiCheck size={16} />
                    <span>Payment Confirmed</span>
                    <small>{new Date(order.paid_at).toLocaleDateString()}</small>
                  </div>
                )}

                {order.shipped_at && (
                  <div className={`timeline-item ${['shipped', 'delivered'].includes(order.status) ? 'completed' : ''}`}>
                    <FiPackage size={16} />
                    <span>Shipped</span>
                    <small>{new Date(order.shipped_at).toLocaleDateString()}</small>
                  </div>
                )}

                {order.delivered_at && (
                  <div className="timeline-item completed">
                    <FiCheck size={16} />
                    <span>Delivered</span>
                    <small>{new Date(order.delivered_at).toLocaleDateString()}</small>
                  </div>
                )}
              </div>

              <div className="order-actions">
                {order.status === 'shipped' && (
                  <button
                    onClick={() => markAsDelivered(order.id)}
                    className="action-btn delivered"
                    disabled={updating === order.id}
                  >
                    <FiCheck size={16} />
                    {updating === order.id ? 'Updating...' : 'Mark as Delivered'}
                  </button>
                )}

                {order.status === 'delivered' && (
                  <div className="status-info completed">
                    <FiCheck size={16} />
                    Order completed successfully
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mobile-bottom-nav">
        <Link href="/" className="navButton">
          <FiHome size={16} />
          <span>Feed</span>
        </Link>
        <Link href="/search" className="navButton">
          <FiSearch size={16} />
          <span>Search</span>
        </Link>
        {userMode === 'buyer' && (
          <>
            <Link href="/cart" className="navButton">
              <FiShoppingCart size={16} />
              <span>Cart</span>
            </Link>
            <Link href="/buyer-orders" className="navButton">
              <FiPackage size={16} />
              <span>Orders</span>
            </Link>
          </>
        )}
        {userMode === 'seller' && (
          <Link href="/seller-orders" className="navButton">
            <FiPackage size={16} />
            <span>Sales</span>
          </Link>
        )}
        <Link href="/settings" className="navButton">
          <FiSettings size={16} />
          <span>Settings</span>
        </Link>
      </div>
    </div>
  );
}