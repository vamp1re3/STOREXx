'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiUserPlus, FiLogIn, FiUpload } from 'react-icons/fi';

export default function Signup() {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profilePic, setProfilePic] = useState('');
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      router.replace('/');
    }
  }, [router]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'profile');

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = (await res.json()) as { success?: boolean; url?: string; error?: string; details?: string };
      if (res.ok && data.success && data.url) {
        setProfilePic(data.url);
      } else {
        alert(`Upload failed: ${data.error || data.details || 'Please try a smaller image.'}`);
      }
    } catch {
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const signup = async () => {
    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        display_name: displayName,
        email,
        password,
        profile_pic: profilePic
      }),
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
      <h1>HELKET</h1>

      <div className="card">
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
        />
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Display Name (optional)"
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          type="email"
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

        <div className="file-upload">
          <label htmlFor="profile-pic-upload" className="upload-btn">
            <FiUpload size={16} /> {uploading ? 'Uploading...' : 'Upload Profile Picture'}
          </label>
          <input
            id="profile-pic-upload"
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
          {profilePic && (
            <div className="preview">
              <Image
                src={profilePic}
                alt="Profile preview"
                width={50}
                height={50}
                unoptimized
                style={{ width: '50px', height: '50px', borderRadius: '50%' }}
              />
            </div>
          )}
        </div>

        <button className="signupBtn" onClick={signup}>
          <FiUserPlus size={18} /> Sign Up
        </button>
        <button className="loginBtn" onClick={() => router.push('/login')}>
          <FiLogIn size={18} /> Login
        </button>
      </div>
    </div>
  );
}