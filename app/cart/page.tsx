'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiArrowLeft, FiShoppingCart, FiTrash2, FiMessageCircle } from 'react-icons/fi';

interface CartItem {
  cart_item_id: number;
  post_id: number;
  title: string;
  description: string;
  price: number;
  discount_percent: number;
  quantity: number;
  stock: number;
  image_url: string;
  media_type: string;
  seller_id: number;
  seller_username: string;
  seller_display_name: string;
  seller_profile_pic: string;
  total_price: number;
  discounted_price: number;
}

export default function CartPage() {
  const [token, setToken] = useState<string | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  const headers = useCallback(() => {
    const headersInit: HeadersInit = {};
    if (token) headersInit.Authorization = `Bearer ${token}`;
    return headersInit;
  }, [token]);

  const loadCart = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/cart', { headers: headers() });
      if (!res.ok) {
        setError('Unable to load your cart.');
        return;
      }
      const data = await res.json();
      setCartItems(data.cartItems || []);
      setSubtotal(data.subtotal || 0);
      setTotal(data.total || 0);
    } catch (error) {
      console.error(error);
      setError('Unable to load your cart.');
    } finally {
      setLoading(false);
    }
  }, [headers]);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
    }
    void loadCart();
  }, [loadCart]);

  const removeItem = async (postId: number) => {
    try {
      await fetch(`/api/cart?postId=${postId}`, {
        method: 'DELETE',
        headers: headers(),
      });
      void loadCart();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="container page-with-mobile-nav">
      <div className="top-bar-row">
        <button onClick={() => router.push('/')} className="back-btn">
          <FiArrowLeft size={16} /> Back to Marketplace
        </button>
        <Link href="/chat" className="top-chat-button" aria-label="Open chats" title="Chats">
          <FiMessageCircle size={18} />
        </Link>
      </div>

      <div className="card">
        <div className="page-header">
          <div>
            <h1><FiShoppingCart size={24} /> My Cart</h1>
            <p>Review products from sellers, update quantities, or remove items before checkout.</p>
          </div>
        </div>

        {loading && <p>Loading cart...</p>}
        {error && <p className="error-text">{error}</p>}
        {!loading && cartItems.length === 0 && <div className="empty-state"><p>Your cart is empty. Browse products from sellers and add items to buy.</p></div>}

        <div className="cart-grid">
          {cartItems.map((item) => (
            <div key={item.cart_item_id} className="cart-item-card">
              <Image
                src={item.image_url || '/default-avatar.svg'}
                alt={item.title}
                width={260}
                height={180}
                unoptimized
                style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '12px' }}
              />
              <div className="cart-item-info">
                <h3>{item.title}</h3>
                <p className="muted-text">Sold by <Link href={`/profile/${item.seller_id}`}>{item.seller_display_name || item.seller_username}</Link></p>
                <p>{item.description || 'No product description available.'}</p>
                <p className="price-block">
                  <strong>${item.discounted_price.toFixed(2)}</strong>
                  {item.discount_percent > 0 && <span className="muted-text">({item.discount_percent}% off)</span>}
                </p>
                <p>Quantity: {item.quantity} / Available: {item.stock}</p>
              </div>
              <button className="deleteBtn" onClick={() => void removeItem(item.post_id)}>
                <FiTrash2 size={16} /> Remove
              </button>
            </div>
          ))}
        </div>

        {cartItems.length > 0 && (
          <div className="cart-summary">
            <div>
              <p className="muted-text">Subtotal</p>
              <p>${subtotal.toFixed(2)}</p>
            </div>
            <div>
              <p className="muted-text">Total after discounts</p>
              <p>${total.toFixed(2)}</p>
            </div>
            <button className="primaryBtn" onClick={() => alert('Checkout is not yet implemented, but your cart is ready.')}>Proceed to checkout</button>
          </div>
        )}
      </div>
    </div>
  );
}
