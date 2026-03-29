'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

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

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    setToken(storedToken);
    loadPosts(storedToken ?? undefined);
  }, []);

  const loadPosts = async (authToken?: string) => {
    const res = await fetch('/api/posts', {
      headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
    });
    const data = await res.json();
    setPosts(data);
  };

  const post = async () => {
    if (!token) return;

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
          <span className="icon icon-feed" /> Feed
        </Link>
        <Link href="/login" className="navButton">
          <span className="icon icon-login" /> Login
        </Link>
        <Link href="/signup" className="navButton">
          <span className="icon icon-signup" /> Sign Up
        </Link>
      </div>

      {!token && (
        <div className="card" id="auth">
          <p>Please login or sign up to interact.</p>
          <Link href="/login" className="navButton">
            <span className="icon icon-login" /> Login
          </Link>
          <Link href="/signup" className="navButton">
            <span className="icon icon-signup" /> Sign Up
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
            <button onClick={post}>Post</button>
            <button onClick={logout}>Logout</button>
          </div>
        </>
      )}

      <div id="feed">
        {posts.length === 0 && <div>No posts yet.</div>}
        {posts.map((p) => (
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
                ❤️ {p.like_count || 0}
              </button>
              <Link href={`/chat/${p.user_id}`}>
                <button disabled={!token}>Chat</button>
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

