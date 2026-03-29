'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Signup() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pic, setPic] = useState('');
  const router = useRouter();

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
      router.push('/login');
    } else {
      alert('Error creating account');
    }
  };

  return (
    <div className="container">
      <h1>🔥 HELKET</h1>

      <div className="card">
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
        <button onClick={() => router.push('/login')}>Login</button>
      </div>
    </div>
  );
}