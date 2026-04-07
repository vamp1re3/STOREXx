'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FiArrowLeft, FiCheck, FiTruck, FiPackage, FiEye, FiHome, FiSearch, FiSettings, FiShoppingCart } from 'react-icons/fi';

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

export default function SellerOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [userMode, setUserMode] = useState<'buyer' | 'seller'>('seller');
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

      const res = await fetch('/api/orders?role=seller', {
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
          setUserMode(userData.current_mode || 'seller');
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

  const updateOrderStatus = async (orderId: number, action: string) => {
    setUpdating(orderId);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action }),
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
              status: action === 'mark_paid' ? 'paid' :
                     action === 'mark_shipped' ? 'shipped' : order.status,
              paid_at: action === 'mark_paid' ? new Date().toISOString() : order.paid_at,
              shipped_at: action === 'mark_shipped' ? new Date().toISOString() : order.shipped_at,
            }
          : order
      ));

      alert(`Order ${action.replace('mark_', '')} successfully!`);
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
        <h1>My Sales</h1>
      </div>

      {error && <p className="error">{error}</p>}

      {orders.length === 0 ? (
        <div className="card">
          <p>You haven't received any orders yet.</p>
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
                  <p>Buyer: {order.buyer_display_name || order.buyer_username}</p>

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

              <div className="order-actions">
                {order.status === 'pending' && order.payment_receipt_url && (
                  <button
                    onClick={() => updateOrderStatus(order.id, 'mark_paid')}
                    className="action-btn paid"
                    disabled={updating === order.id}
                  >
                    <FiCheck size={16} />
                    {updating === order.id ? 'Updating...' : 'Mark as Paid'}
                  </button>
                )}

                {order.status === 'paid' && (
                  <button
                    onClick={() => updateOrderStatus(order.id, 'mark_shipped')}
                    className="action-btn shipped"
                    disabled={updating === order.id}
                  >
                    <FiTruck size={16} />
                    {updating === order.id ? 'Updating...' : 'Mark as Shipped'}
                  </button>
                )}

                {order.status === 'shipped' && (
                  <div className="status-info">
                    <FiPackage size={16} />
                    Waiting for buyer to confirm delivery
                  </div>
                )}

                {order.status === 'delivered' && (
                  <div className="status-info completed">
                    <FiCheck size={16} />
                    Order completed
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