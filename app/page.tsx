'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FiRss, FiLogIn, FiUserPlus, FiHeart, FiMessageCircle, FiLogOut, FiSettings, FiUpload } from 'react-icons/fi';

interface Post {
  id: number;
  user_id: number;
  username: string;
  display_name: string;
  profile_pic: string;
  image_url: string;
  caption: string;
  like_count: number;
  is_liked: boolean;
}

export default function Home() {
  const [token, setToken] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [img, setImg] = useState('');
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    setToken(storedToken);
    loadPosts(storedToken ?? undefined);
  }, []);

  const loadPosts = async (authToken?: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/posts', {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      });
      const data = await res.json();
      setPosts(data);
    } catch (error) {
      console.error('Failed to load posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'post');

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setImg(data.url);
      } else {
        alert('Upload failed: ' + data.error);
      }
    } catch (error) {
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const post = async () => {
    if (!token || !img.trim() || !caption.trim()) return;

    setPosting(true);
    try {
      await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ image_url: img, caption: caption }),
      });
      setImg('');
      setCaption('');
      loadPosts(token);
    } catch (error) {
      console.error('Failed to post:', error);
    } finally {
      setPosting(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setPosts([]);
  };

  return (
    <div className="container">
      <h1>HELKET</h1>

      <div className="navBar">
        <Link href="/" className="navButton">
          <FiRss size={16} /> Feed
        </Link>
        {token ? (
          <>
            <Link href="/settings" className="navButton">
              <FiSettings size={16} /> Settings
            </Link>
            <button onClick={logout} className="navButton logout-button">
              <FiLogOut size={16} /> Logout
            </button>
          </>
        ) : (
          <>
            <Link href="/login" className="navButton">
              <FiLogIn size={16} /> Login
            </Link>
            <Link href="/signup" className="navButton">
              <FiUserPlus size={16} /> Sign Up
            </Link>
          </>
        )}
      </div>

      {!token && (
        <div className="card" id="auth">
          <p>Please login or sign up to interact.</p>
          <Link href="/login" className="navButton">
            <FiLogIn size={16} /> Login
          </Link>
          <Link href="/signup" className="navButton">
            <FiUserPlus size={16} /> Sign Up
          </Link>
        </div>
      )}

      {token && (
        <>
          <div className="card" id="postBox">
            <div className="file-upload">
              <label htmlFor="post-image-upload" className="upload-btn">
                <FiUpload size={16} /> {uploading ? 'Uploading...' : img ? 'Change Image' : 'Upload Image'}
              </label>
              <input
                id="post-image-upload"
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
              {img && (
                <div className="preview">
                  <img src={img} alt="Post preview" style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '8px' }} />
                </div>
              )}
            </div>
            <input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Caption (optional)"
            />
            <button onClick={post} disabled={posting || !img.trim()}>
              {posting ? 'Posting...' : 'Post'}
            </button>
            <button onClick={logout} className="logoutBtn">
              <FiLogOut size={16} /> Logout
            </button>
          </div>
        </>
      )}

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
          <div className="empty-state">
            <p>No posts yet. Be the first to share something!</p>
          </div>
        )}

        {!loading && posts.map((p) => (
          <div key={p.id} className="post">
            <div className="user">
              <img
                src={p.profile_pic || 'https://via.placeholder.com/40'}
                alt="Profile"
              />
              <b>
                <Link href={`/profile/${p.user_id}`}>
                  {p.display_name || p.username}
                </Link>
              </b>
            </div>
            <img src={p.image_url} alt="Post" />
            <div className="caption">{p.caption}</div>
            <div className="actions">
              <button
                className={`likeBtn ${p.is_liked ? 'liked' : ''}`}
                disabled={!token}
                onClick={() => toggleLike(p.id)}
              >
                <FiHeart size={16} /> {p.like_count || 0}
              </button>
              <Link href={`/chat/${p.user_id}`}>
                <button disabled={!token} className="chatBtn">
                  <FiMessageCircle size={16} /> Chat
                </button>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  async function toggleLike(postId: number) {
    if (!token) return;
    await fetch(`/api/like/${postId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    loadPosts(token);
  }
}

