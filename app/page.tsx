'use client';

import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  FiActivity,
  FiBookmark,
  FiChevronDown,
  FiChevronUp,
  FiHeart,
  FiHome,
  FiLogIn,
  FiMessageCircle,
  FiMessageSquare,
  FiSearch,
  FiSettings,
  FiShoppingCart,
  FiTrash2,
  FiUpload,
  FiUserPlus,
} from 'react-icons/fi';
import Stories from './components/Stories';
import CreateStory from './components/CreateStory';

interface Post {
  id: number;
  user_id: number;
  username: string;
  display_name: string;
  profile_pic: string;
  image_url: string;
  title: string;
  description: string;
  price: number;
  condition: string;
  stock: number;
  discount_percent: number;
  like_count: number;
  comment_count: number;
  is_liked: boolean;
  is_bookmarked: boolean;
  media_type: 'image' | 'video';
}

interface Comment {
  id: number;
  user_id: number;
  username: string;
  display_name: string;
  profile_pic: string;
  content: string;
  created_at: string;
}

export default function Home() {
  const [token, setToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<number, number>>({});
  const [commentsByPostId, setCommentsByPostId] = useState<Record<number, Comment[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<number, string>>({});
  const [activeCommentsPostId, setActiveCommentsPostId] = useState<number | null>(null);
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [condition, setCondition] = useState('new');
  const [stock, setStock] = useState('1');
  const [discountPercent, setDiscountPercent] = useState('0');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [introHidden, setIntroHidden] = useState(false);
  const [showCreateStory, setShowCreateStory] = useState(false);

  const getHeaders = useCallback((authToken?: string, includeJson = false): HeadersInit => {
    const headers: HeadersInit = {};
    if (includeJson) {
      headers['Content-Type'] = 'application/json';
    }
    if (authToken) {
      headers.Authorization = `Bearer ${authToken}`;
    }
    return headers;
  }, []);

  const loadViewer = useCallback(async (authToken?: string) => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: getHeaders(authToken),
      });

      if (!res.ok) {
        setCurrentUserId(null);
        setIsAuthenticated(false);
        return;
      }

      const user = await res.json();
      setCurrentUserId(user.id);
      setIsAuthenticated(true);
    } catch (error) {
      console.error('Failed to load viewer:', error);
    }
  }, [getHeaders]);

  const loadPosts = useCallback(async (authToken?: string, showLoader = true) => {
    if (showLoader) {
      setLoading(true);
    }

    try {
      const res = await fetch('/api/posts', {
        headers: getHeaders(authToken),
      });
      const data = await res.json();
      setPosts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load posts:', error);
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  }, [getHeaders]);

  const loadUnreadCounts = useCallback(async (authToken?: string) => {
    try {
      const res = await fetch('/api/messages/unread', {
        headers: getHeaders(authToken),
      });

      if (!res.ok) {
        return;
      }

      const data = await res.json();
      setUnreadCounts(data.counts || {});
    } catch (error) {
      console.error('Failed to load unread counts:', error);
    }
  }, [getHeaders]);

  const loadComments = useCallback(async (postId: number) => {
    try {
      const res = await fetch(`/api/comments/${postId}`);
      const data = await res.json();
      setCommentsByPostId((prev) => ({ ...prev, [postId]: Array.isArray(data) ? data : [] }));
    } catch (error) {
      console.error('Failed to load comments:', error);
    }
  }, []);

  const initializeSession = useCallback(async () => {
    const storedToken = localStorage.getItem('token');

    if (storedToken) {
      setToken(storedToken);
      setIsAuthenticated(true);
      await Promise.all([
        loadViewer(storedToken),
        loadPosts(storedToken),
        loadUnreadCounts(storedToken),
      ]);
      return;
    }

    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const user = await res.json();
        setIsAuthenticated(true);
        setCurrentUserId(user.id);
        await Promise.all([loadPosts(), loadUnreadCounts()]);
        return;
      }
    } catch (error) {
      console.error('Failed to restore session:', error);
    }

    setIsAuthenticated(false);
    setCurrentUserId(null);
    await loadPosts();
  }, [loadPosts, loadUnreadCounts, loadViewer]);

  useEffect(() => {
    const savedPreference = localStorage.getItem('helket-intro-hidden');
    setIntroHidden(savedPreference === '1');
    void initializeSession();
  }, [initializeSession]);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    const interval = window.setInterval(() => {
      void loadPosts(token ?? undefined, false);
      void loadUnreadCounts(token ?? undefined);
    }, 6000);

    return () => window.clearInterval(interval);
  }, [isAuthenticated, token, loadPosts, loadUnreadCounts]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      console.log('No file selected');
      return;
    }

    console.log('File selected:', file.name, file.size, file.type);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'post');

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      const data = (await res.json()) as { success?: boolean; url?: string; error?: string; details?: string };
      if (res.ok && data.success && data.url) {
        setMediaUrl(data.url);
        setMediaType(file.type.startsWith('video/') ? 'video' : 'image');
      } else {
        alert(`Upload failed: ${data.error || data.details || 'Please try a smaller file.'}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed');
    } finally {
      setUploading(false);
      // Reset file input
      const fileInput = document.getElementById('post-media-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    }
  };

  const post = async () => {
    if (!isAuthenticated || !mediaUrl.trim() || !title.trim()) return;

    setPosting(true);
    try {
      await fetch('/api/posts', {
        method: 'POST',
        headers: getHeaders(token ?? undefined, true),
        body: JSON.stringify({
          image_url: mediaUrl,
          title,
          description,
          price: Number(price) || 0,
          condition,
          stock: Number(stock) || 1,
          discount_percent: Number(discountPercent) || 0,
          media_type: mediaType,
        }),
      });
      setMediaUrl('');
      setTitle('');
      setDescription('');
      setPrice('');
      setCondition('new');
      setStock('1');
      setDiscountPercent('0');
      setMediaType('image');
      await loadPosts(token ?? undefined);
    } catch (error) {
      console.error('Failed to post:', error);
    } finally {
      setPosting(false);
    }
  };

  const toggleLike = async (postId: number) => {
    if (!isAuthenticated) return;
    await fetch(`/api/like/${postId}`, {
      method: 'POST',
      headers: getHeaders(token ?? undefined),
    });
    await loadPosts(token ?? undefined);
  };

  const toggleBookmark = async (postId: number) => {
    if (!isAuthenticated) return;
    await fetch(`/api/bookmarks/${postId}`, {
      method: 'POST',
      headers: getHeaders(token ?? undefined),
    });
    await loadPosts(token ?? undefined);
  };

  const toggleComments = async (postId: number) => {
    const nextValue = activeCommentsPostId === postId ? null : postId;
    setActiveCommentsPostId(nextValue);
    if (nextValue) {
      await loadComments(postId);
    }
  };

  const addComment = async (postId: number) => {
    const content = commentInputs[postId]?.trim();
    if (!content) return;

    const res = await fetch(`/api/comments/${postId}`, {
      method: 'POST',
      headers: getHeaders(token ?? undefined, true),
      body: JSON.stringify({ content }),
    });

    if (!res.ok) {
      const data = await res.json();
      alert(data.error || 'Comment failed');
      return;
    }

    setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
    await Promise.all([loadComments(postId), loadPosts(token ?? undefined)]);
  };

  const deletePost = async (postId: number) => {
    if (!confirm('Delete this product?')) {
      return;
    }

    const res = await fetch(`/api/posts/${postId}`, {
      method: 'DELETE',
      headers: getHeaders(token ?? undefined),
    });

    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Could not delete product');
      return;
    }

    await loadPosts(token ?? undefined);
  };

  const addToCart = async (postId: number) => {
    if (!isAuthenticated) {
      alert('Please log in to add items to your cart.');
      return;
    }

    const res = await fetch('/api/cart', {
      method: 'POST',
      headers: getHeaders(token ?? undefined, true),
      body: JSON.stringify({ post_id: postId, quantity: 1 }),
    });

    if (!res.ok) {
      const data = await res.json();
      alert(data.error || 'Failed to add item to cart');
      return;
    }

    alert('Added to cart');
  };

  const toggleIntro = () => {
    setIntroHidden((current) => {
      const nextValue = !current;
      localStorage.setItem('helket-intro-hidden', nextValue ? '1' : '0');
      return nextValue;
    });
  };

  return (
    <div className="container page-with-mobile-nav">
      <div className={`hero-card ${introHidden ? 'hero-card-collapsed' : ''}`}>
        <div className="hero-copy">
          <p className="eyebrow">Luxury dark social</p>
          <h1 className="brand-title">HELKET</h1>
          {!introHidden && (
            <p className="brand-subtitle">
              Buy from sellers or list products with price, stock and discounts in a modern marketplace experience.
            </p>
          )}
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="icon-chip"
            onClick={toggleIntro}
            aria-label={introHidden ? 'Show intro' : 'Hide intro'}
            title={introHidden ? 'Show intro' : 'Hide intro'}
          >
            {introHidden ? <FiChevronDown size={16} /> : <FiChevronUp size={16} />}
          </button>
          {isAuthenticated && (
            <span className="icon-chip status-icon" aria-label="Session active" title="Session active">
              <FiActivity size={16} />
            </span>
          )}
          {isAuthenticated && (
            <Link href="/chat" className="top-chat-button" aria-label="Open chats" title="Chats">
              <FiMessageCircle size={18} />
              {Object.values(unreadCounts).reduce((total, count) => total + count, 0) > 0 ? (
                <span className="badge-dot top-chat-badge">{Object.values(unreadCounts).reduce((total, count) => total + count, 0)}</span>
              ) : null}
            </Link>
          )}
        </div>
      </div>

      {!isAuthenticated && (
        <div className="card auth-card" id="auth">
          <p className="eyebrow">Welcome</p>
          <h2>Login to unlock your feed</h2>
          <p className="muted-text">Search users, upload posts, save favorites, and send private messages once you sign in.</p>
          <div className="button-group auth-actions">
            <Link href="/login" className="navButton">
              <FiLogIn size={16} /> Login
            </Link>
            <Link href="/signup" className="navButton">
              <FiUserPlus size={16} /> Sign Up
            </Link>
          </div>
        </div>
      )}

      {isAuthenticated && (
        <div className="card composer-card" id="postBox">
          <div className="composer-header">
            <div>
              <p className="eyebrow">Seller tools</p>
              <h3>List a product</h3>
            </div>
            <span className="composer-hint">{mediaUrl ? 'Product image ready' : 'Upload product image or video'}</span>
          </div>
          <div className="file-upload">
            <label
              htmlFor="post-media-upload"
              className="upload-btn icon-only"
              aria-label={uploading ? 'Uploading media' : mediaUrl ? 'Change media' : 'Upload media'}
              title={uploading ? 'Uploading media' : mediaUrl ? 'Change media' : 'Upload media'}
            >
              <FiUpload size={16} />
            </label>
            <input
              id="post-media-upload"
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime,video/x-msvideo"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
            {mediaUrl && (
              <div className="preview">
                {mediaType === 'image' ? (
                  <Image
                    src={mediaUrl}
                    alt="Product preview"
                    width={100}
                    height={100}
                    unoptimized
                    style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '8px' }}
                  />
                ) : (
                  <video src={mediaUrl} style={{ width: '120px', height: '90px', borderRadius: '8px' }} controls />
                )}
              </div>
            )}
          </div>

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Product title"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Product description"
          />
          <div className="product-meta-row">
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Price"
              type="number"
              min="0"
              step="0.01"
            />
            <input
              value={stock}
              onChange={(e) => setStock(e.target.value)}
              placeholder="Stock"
              type="number"
              min="1"
            />
            <input
              value={discountPercent}
              onChange={(e) => setDiscountPercent(e.target.value)}
              placeholder="Discount %"
              type="number"
              min="0"
              max="100"
            />
          </div>
          <select value={condition} onChange={(e) => setCondition(e.target.value)}>
            <option value="new">New</option>
            <option value="like new">Like new</option>
            <option value="used">Used</option>
            <option value="refurbished">Refurbished</option>
          </select>
          <div className="button-group">
            <button onClick={post} disabled={posting || !mediaUrl.trim() || !title.trim()}>
              {posting ? 'Listing...' : 'List Product'}
            </button>
            <Link href="/cart" className="navButton">
              <FiShoppingCart size={16} /> View Cart
            </Link>
          </div>
        </div>
      )}

      {isAuthenticated && (
        <Stories onCreateStory={() => setShowCreateStory(true)} />
      )}

      {isAuthenticated ? (
        <div id="feed">
          {loading && (
            <div className="skeleton-container">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="skeleton-post">
                  <div className="skeleton-header"></div>
                  <div className="skeleton-image"></div>
                  <div className="skeleton-caption"></div>
                  <div className="skeleton-actions"></div>
                </div>
              ))}
            </div>
          )}

          {!loading && posts.length === 0 && (
            <div className="empty-state card">
              <p>No posts yet. Be the first to share something.</p>
            </div>
          )}

          {!loading && posts.map((postItem) => (
            <div key={postItem.id} className="post media-post-card">
              <div className="user">
                <Image
                  src={postItem.profile_pic || '/default-avatar.svg'}
                  alt="Profile"
                  width={40}
                  height={40}
                  unoptimized
                />
                <div className="user-meta">
                  <b>
                    <Link href={`/profile/${postItem.user_id}`}>
                      {postItem.display_name || postItem.username}
                    </Link>
                  </b>
                  <span className="handle">@{postItem.username}</span>
                </div>
              </div>

              {postItem.media_type === 'video' ? (
                <video src={postItem.image_url} controls style={{ width: '100%', borderRadius: '12px' }} />
              ) : (
                <Image
                  src={postItem.image_url}
                  alt={postItem.title}
                  width={800}
                  height={800}
                  unoptimized
                  style={{ width: '100%', height: 'auto' }}
                />
              )}

              <div className="product-details">
                <h3>{postItem.title || 'Untitled product'}</h3>
                <p className="muted-text">{postItem.description || 'No product description provided.'}</p>
                <div className="price-row">
                  <span className="price">${(postItem.price || 0).toFixed(2)}</span>
                  {postItem.discount_percent > 0 && (
                    <span className="discount">{postItem.discount_percent}% off</span>
                  )}
                </div>
                <div className="meta-row">
                  <span>{postItem.condition}</span>
                  <span>{postItem.stock} in stock</span>
                </div>
              </div>

              <div className="actions">
                <button className="profileBtn" onClick={() => void addToCart(postItem.id)}>
                  <FiShoppingCart size={16} /> Add to cart
                </button>
                <button className="profileBtn" onClick={() => void toggleComments(postItem.id)}>
                  <FiMessageSquare size={16} /> {postItem.comment_count || 0}
                </button>
                <button className={`profileBtn ${postItem.is_bookmarked ? 'liked' : ''}`} onClick={() => void toggleBookmark(postItem.id)}>
                  <FiBookmark size={16} /> Save
                </button>
                <Link href={`/chat/${postItem.user_id}`} className="chatBtn">
                  <FiMessageCircle size={16} />
                  Chat
                  {unreadCounts[postItem.user_id] ? <span className="badge-dot">{unreadCounts[postItem.user_id]}</span> : null}
                </Link>
                {currentUserId === postItem.user_id && (
                  <button className="logoutBtn" onClick={() => void deletePost(postItem.id)}>
                    <FiTrash2 size={16} /> Delete
                  </button>
                )}
              </div>

              {activeCommentsPostId === postItem.id && (
                <div className="comments-panel">
                  <div className="comments-list">
                    {(commentsByPostId[postItem.id] || []).map((comment) => (
                      <div key={comment.id} className="comment-item">
                        <strong>{comment.display_name || comment.username}</strong>
                        <span>{comment.content}</span>
                      </div>
                    ))}
                    {(commentsByPostId[postItem.id] || []).length === 0 && (
                      <p className="muted-text">No comments yet. Start the conversation.</p>
                    )}
                  </div>
                  <div className="comment-input-row">
                    <input
                      value={commentInputs[postItem.id] || ''}
                      onChange={(e) => setCommentInputs((prev) => ({ ...prev, [postItem.id]: e.target.value }))}
                      placeholder="Write a comment..."
                    />
                    <button onClick={() => void addComment(postItem.id)}>Send</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state card">
          <p>Please login or sign up to view the feed.</p>
        </div>
      )}

      {isAuthenticated && (
        <div className="mobile-bottom-nav">
          <Link href="/" className="navButton">
            <FiHome size={16} />
            <span>Feed</span>
          </Link>
          <Link href="/search" className="navButton">
            <FiSearch size={16} />
            <span>Search</span>
          </Link>
          <Link href="/settings" className="navButton">
            <FiSettings size={16} />
            <span>Settings</span>
          </Link>
        </div>
      )}

      <CreateStory
        isOpen={showCreateStory}
        onClose={() => setShowCreateStory(false)}
        onStoryCreated={() => {
          setShowCreateStory(false);
          // Could refresh stories here if needed
        }}
      />
    </div>
  );
}

