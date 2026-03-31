'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FiLogIn, FiUserPlus } from 'react-icons/fi';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      router.replace('/');
    }
  }, [router]);

  const login = async () => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (data.token) {
      localStorage.setItem('token', data.token);
      router.push('/');
    } else {
      alert('Login failed');
    }
  };

  return (
    <div className="container auth-shell">
      <div className="card auth-card">
        <p className="eyebrow">Welcome back</p>
        <h1 className="brand-title">HELKET</h1>
        <p className="brand-subtitle">Sign in to your luxury dark feed, private chats, and media sharing.</p>

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
        <button className="loginBtn" onClick={login}>
          <FiLogIn size={18} /> Login
        </button>
        <button className="signupBtn" onClick={() => router.push('/signup')}>
          <FiUserPlus size={18} /> Sign Up
        </button>
      </div>
    </div>
  );
}