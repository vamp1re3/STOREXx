'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { FiArrowLeft, FiUpload, FiCheck, FiX, FiHome, FiSearch, FiSettings, FiShoppingCart, FiPackage } from 'react-icons/fi';

interface CartItem {
  id: number;
  post_id: number;
  quantity: number;
  title: string;
  image_url: string;
  price: number;
  seller_username: string;
  seller_display_name: string;
  bank_name: string;
  account_holder_name: string;
  account_number: string;
  routing_number: string;
  bank_address: string;
}

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
  bank_name: string;
  account_holder_name: string;
  account_number: string;
  routing_number: string;
  bank_address: string;
}

function CheckoutContent() {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [userMode, setUserMode] = useState<string>('buyer');
  const [loading, setLoading] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [shippingAddress, setShippingAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const loadCartItems = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          router.push('/login');
          return;
        }

        const res = await fetch('/api/cart', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          if (res.status === 401) {
            router.push('/login');
            return;
          }
          throw new Error('Failed to load cart');
        }

        const data = await res.json();
        setCartItems(data);

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
      } catch (error) {
        console.error('Failed to load cart:', error);
        setError('Failed to load cart items');
      } finally {
        setLoading(false);
      }
    };

    loadCartItems();
  }, [router]);

  const placeOrder = async () => {
    if (!shippingAddress.trim()) {
      setError('Shipping address is required');
      return;
    }

    setPlacingOrder(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const cartItemIds = cartItems.map(item => item.id);

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          cartItemIds,
          shippingAddress,
          notes,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to place order');
      }

      const data = await res.json();
      setOrders(data.orders);

      // Redirect to orders page or show success message
      alert('Order placed successfully! Please complete payment using the bank details below.');
    } catch (error: any) {
      setError(error.message);
    } finally {
      setPlacingOrder(false);
    }
  };

  const uploadPaymentReceipt = async (orderId: number, file: File) => {
    setUploadingReceipt(true);

    try {
      // First upload the file
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'receipt');

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        throw new Error('Failed to upload receipt');
      }

      const uploadData = await uploadRes.json();
      if (!uploadData.success || !uploadData.url) {
        throw new Error('Upload failed');
      }

      // Then update the order with the receipt URL
      const token = localStorage.getItem('token');
      const updateRes = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'upload_receipt',
          paymentReceiptUrl: uploadData.url,
        }),
      });

      if (!updateRes.ok) {
        throw new Error('Failed to update order');
      }

      // Update local state
      setOrders(prev => prev.map(order =>
        order.id === orderId
          ? { ...order, payment_receipt_url: uploadData.url }
          : order
      ));

      alert('Payment receipt uploaded successfully!');
    } catch (error: any) {
      alert('Failed to upload receipt: ' + error.message);
    } finally {
      setUploadingReceipt(false);
    }
  };

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  if (loading) {
    return (
      <div className="container">
        <div className="card">
          <p>Loading checkout...</p>
        </div>
      </div>
    );
  }

  if (cartItems.length === 0 && orders.length === 0) {
    return (
      <div className="container">
        <div className="card">
          <p>Your cart is empty. <Link href="/">Browse products</Link></p>
        </div>
      </div>
    );
  }

  return (
    <div className="container page-with-mobile-nav">
      <div className="checkout-header top-bar-row">
        <button onClick={() => router.back()} className="back-btn">
          <FiArrowLeft size={16} /> Back
        </button>
        <h1>Checkout</h1>
      </div>

      {cartItems.length > 0 && (
        <div className="checkout-section">
          <h2>Order Summary</h2>

          <div className="order-items">
            {cartItems.map((item) => (
              <div key={item.id} className="order-item">
                <Image
                  src={item.image_url}
                  alt={item.title}
                  width={80}
                  height={80}
                  unoptimized
                  style={{ borderRadius: '8px', objectFit: 'cover' }}
                />
                <div className="item-details">
                  <h3>{item.title}</h3>
                  <p>Seller: {item.seller_display_name || item.seller_username}</p>
                  <p>Quantity: {item.quantity}</p>
                  <p className="price">${(item.price * item.quantity).toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="order-total">
            <strong>Total: ${calculateTotal().toFixed(2)}</strong>
          </div>

          <div className="shipping-form">
            <h3>Shipping Information</h3>
            <textarea
              value={shippingAddress}
              onChange={(e) => setShippingAddress(e.target.value)}
              placeholder="Enter your shipping address"
              rows={4}
              required
            />
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes (optional)"
              rows={2}
            />
          </div>

          {error && <p className="error">{error}</p>}

          <button
            onClick={placeOrder}
            className="checkout-btn"
            disabled={placingOrder}
          >
            {placingOrder ? 'Placing Order...' : 'Place Order'}
          </button>
        </div>
      )}

      {orders.length > 0 && (
        <div className="payment-section">
          <h2>Complete Payment</h2>
          <p>Please transfer the payment using the bank details below and upload your receipt.</p>

          {orders.map((order) => (
            <div key={order.id} className="payment-card">
              <div className="order-header">
                <h3>Order #{order.id}</h3>
                <span className={`status ${order.status}`}>{order.status}</span>
              </div>

              <div className="order-details">
                <Image
                  src={order.image_url}
                  alt={order.title}
                  width={100}
                  height={100}
                  unoptimized
                  style={{ borderRadius: '8px', objectFit: 'cover' }}
                />
                <div>
                  <h4>{order.title}</h4>
                  <p>Quantity: {order.quantity}</p>
                  <p>Total: ${order.total_amount.toFixed(2)}</p>
                </div>
              </div>

              <div className="bank-details">
                <h4>Bank Transfer Details</h4>
                <div className="bank-info">
                  <p><strong>Bank Name:</strong> {order.bank_name}</p>
                  <p><strong>Account Holder:</strong> {order.account_holder_name}</p>
                  <p><strong>Account Number:</strong> {order.account_number}</p>
                  {order.routing_number && <p><strong>Routing Number:</strong> {order.routing_number}</p>}
                  <p><strong>Bank Address:</strong> {order.bank_address}</p>
                </div>
              </div>

              <div className="payment-actions">
                {!order.payment_receipt_url ? (
                  <div className="upload-receipt">
                    <label className="upload-btn">
                      <FiUpload size={16} />
                      Upload Payment Receipt
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            uploadPaymentReceipt(order.id, file);
                          }
                        }}
                        style={{ display: 'none' }}
                      />
                    </label>
                  </div>
                ) : (
                  <div className="receipt-uploaded">
                    <FiCheck size={16} />
                    Payment receipt uploaded
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

export default function Checkout() {
  return (
    <Suspense fallback={<div className="container"><div className="card"><p>Loading...</p></div></div>}>
      <CheckoutContent />
    </Suspense>
  );
}