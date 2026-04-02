'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiEye, FiEyeOff, FiLogIn, FiUserPlus } from 'react-icons/fi';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        router.replace('/');
        return;
      }

      const res = await fetch('/api/auth/me');
      if (res.ok) {
        router.replace('/');
      }
    };

    void restoreSession();
  }, [router]);

  const login = async () => {
    setLoading(true);
    setError('');

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
      setError(data.error || 'Login failed');
    }

    setLoading(false);
  };

  return (
    <div className="container auth-shell">
      <div className="card auth-card">
        <p className="eyebrow">Welcome back</p>
        <h1 className="brand-title">HELKET</h1>
        <p className="brand-subtitle">Sign in to your luxury dark feed, private chats, and media sharing.</p>

        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" />
        <div className="password-field">
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            type={showPassword ? 'text' : 'password'}
          />
          <button
            type="button"
            className="password-toggle"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            title={showPassword ? 'Hide password' : 'Show password'}
            onClick={() => setShowPassword((value) => !value)}
          >
            {showPassword ? <FiEyeOff size={15} /> : <FiEye size={15} />}
          </button>
        </div>
        {error && <p style={{ color: '#ffabab' }}>{error}</p>}

        <button
          className="googleBtn"
          onClick={() => window.location.href = '/api/auth/google'}
        >
          Continue with Google
        </button>

        <div className="divider">
          <span>or</span>
        </div>

        <button className="loginBtn" onClick={() => void login()} disabled={loading}>
          <FiLogIn size={18} /> {loading ? 'Logging in...' : 'Login'}
        </button>
        <button className="signupBtn" onClick={() => router.push('/signup')}>
          <FiUserPlus size={18} /> Sign Up
        </button>
      </div>
    </div>
  );
}