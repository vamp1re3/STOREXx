'use client';

import { useState, useEffect } from 'react';

interface Post {
  id: number;
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
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pic, setPic] = useState('');

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    setToken(storedToken);
    if (storedToken) {
      loadPosts();
    }
  }, []);

  const loadPosts = async () => {
    const res = await fetch('/api/posts', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const data = await res.json();
    setPosts(data);
  };

  const signup = async () => {
    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password, profile_pic: pic }),
    });
    if (res.ok) {
      alert('Account created');
      window.location.href = '/login';
    } else {
      alert('Error creating account');
    }
  };

  const login = async () => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (data.token) {
      localStorage.setItem('token', data.token);
      setToken(data.token);
      loadPosts();
    } else {
      alert('Login failed');
    }
  };

  const post = async () => {
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
    loadPosts();
  };

  const toggleLike = async (postId: number) => {
    await fetch(`/api/like/${postId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    loadPosts();
  };

  return (
    <div className="container">
      <h1>🔥 HELKET</h1>

      {!token && (
        <div className="card" id="auth">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
          />
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
          />
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            type="password"
          />
          <input
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm Password"
            type="password"
          />
          <input
            value={pic}
            onChange={(e) => setPic(e.target.value)}
            placeholder="Profile Pic URL"
          />
          <button onClick={signup}>Sign Up</button>
          <button onClick={login}>Login</button>
        </div>
      )}

      {token && (
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
        </div>
      )}

      <div id="feed">
        {posts.map((p) => (
          <div key={p.id} className="post">
            <div className="user">
              <img src={p.profile_pic || 'https://via.placeholder.com/40'} alt="Profile" />
              <b>{p.username}</b>
            </div>
            <img src={p.image_url} alt="Post" />
            <div className="caption">{p.caption}</div>
            <button
              className={`likeBtn ${p.is_liked ? 'liked' : ''}`}
              onClick={() => toggleLike(p.id)}
            >
              ❤️ {p.like_count || 0}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
