'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FiRss, FiLogIn, FiUserPlus, FiHeart, FiMessageCircle, FiLogOut } from 'react-icons/fi';

interface Post {
  id: number;
  user_id: number;
  username: string;
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
  const [cap, setCap] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);

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

  const post = async () => {
    if (!token || !img.trim() || !cap.trim()) return;

    setPosting(true);
    try {
      await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ image_url: img, caption: cap }),
      });
      setImg('');
      setCap('');
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
        <Link href="/login" className="navButton">
          <FiLogIn size={16} /> Login
        </Link>
        <Link href="/signup" className="navButton">
          <FiUserPlus size={16} /> Sign Up
        </Link>
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
            <input
              value={img}
              onChange={(e) => setImg(e.target.value)}
              placeholder="Image URL"
            />
            <input
              value={cap}
              onChange={(e) => setCap(e.target.value)}
              placeholder="Caption"
            />
            <button onClick={post} disabled={posting || !img.trim() || !cap.trim()}>
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
                  {p.username}
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

