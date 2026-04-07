'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiEye, FiEyeOff, FiLogIn, FiUpload, FiUserPlus } from 'react-icons/fi';

export default function Signup() {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [profilePic, setProfilePic] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>(['buyer']);
  const [bankName, setBankName] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');
  const [bankAddress, setBankAddress] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [googleData, setGoogleData] = useState<{
    google_id: string;
    email: string;
    name: string;
    picture: string;
  } | null>(null);
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

  useEffect(() => {
    // Check for Google OAuth data in URL
    const urlParams = new URLSearchParams(window.location.search);
    const googleId = urlParams.get('google_id');
    const googleEmail = urlParams.get('email');
    const googleName = urlParams.get('name');
    const googlePicture = urlParams.get('picture');

    if (googleId && googleEmail && googleName) {
      setGoogleData({
        google_id: googleId,
        email: googleEmail,
        name: googleName,
        picture: googlePicture || '',
      });
      setEmail(googleEmail);
      setDisplayName(googleName);
      setProfilePic(googlePicture || '');
    }
  }, []);

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
        setError(data.error || data.details || 'Please try a smaller image.');
      }
    } catch {
      setError('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const signup = async () => {
    if (!googleData && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError('');

    const signupData: any = {
      username,
      display_name: displayName,
      email,
      profile_pic: profilePic,
      roles: selectedRoles,
    };

    // Add bank details if user is a seller
    if (selectedRoles.includes('seller')) {
      signupData.bank_name = bankName;
      signupData.account_holder_name = accountHolderName;
      signupData.account_number = accountNumber;
      signupData.routing_number = routingNumber;
      signupData.bank_address = bankAddress;
    }

    if (googleData) {
      signupData.google_id = googleData.google_id;
    } else {
      signupData.password = password;
    }

    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(signupData),
    });

    const data = await res.json();
    if (res.ok && data.token) {
      localStorage.setItem('token', data.token);
      router.push('/');
    } else {
      setError(data.error || 'Error creating account');
    }

    setLoading(false);
  };

  return (
    <div className="container auth-shell">
      <div className="card auth-card">
        <p className="eyebrow">Create account</p>
        <h1 className="brand-title">Join StoreX</h1>
        <p className="brand-subtitle">
          {googleData
            ? 'Complete your profile to finish signing up with Google and join the luxury dark feed.'
            : 'Create your account and enter StoreX with a rich black background, deep red accents, and premium media sharing.'
          }
        </p>

        {googleData && (
          <div className="google-notice">
            <p>Signing up with Google account: <strong>{googleData.email}</strong></p>
          </div>
        )}

        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username" />
        <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Display Name (optional)" />
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email" disabled={!!googleData} />

        <div className="role-selection">
          <p className="role-title">Choose your account type(s):</p>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={selectedRoles.includes('buyer')}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedRoles(prev => [...prev, 'buyer']);
                } else {
                  setSelectedRoles(prev => prev.filter(r => r !== 'buyer'));
                }
              }}
            />
            <span className="role-description">
              <strong>Buyer:</strong> Browse products, add to cart, chat with sellers, make purchases
            </span>
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={selectedRoles.includes('seller')}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelectedRoles(prev => [...prev, 'seller']);
                } else {
                  setSelectedRoles(prev => prev.filter(r => r !== 'seller'));
                }
              }}
            />
            <span className="role-description">
              <strong>Seller:</strong> List products, manage inventory, set prices/discounts, chat with buyers
            </span>
          </label>
        </div>

        {selectedRoles.includes('seller') && (
          <div className="bank-details-section">
            <p className="section-title">Bank Details (Required for Sellers)</p>
            <p className="section-subtitle">Buyers will use this information to transfer payment for your products.</p>

            <input
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="Bank Name"
            />
            <input
              value={accountHolderName}
              onChange={(e) => setAccountHolderName(e.target.value)}
              placeholder="Account Holder Name"
            />
            <input
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="Account Number"
            />
            <input
              value={routingNumber}
              onChange={(e) => setRoutingNumber(e.target.value)}
              placeholder="Routing Number (if applicable)"
            />
            <textarea
              value={bankAddress}
              onChange={(e) => setBankAddress(e.target.value)}
              placeholder="Bank Address"
              rows={3}
            />
          </div>
        )}

        {!googleData && (
          <>
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
            <div className="password-field">
              <input
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm Password"
                type={showConfirmPassword ? 'text' : 'password'}
              />
              <button
                type="button"
                className="password-toggle"
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                title={showConfirmPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowConfirmPassword((value) => !value)}
              >
                {showConfirmPassword ? <FiEyeOff size={15} /> : <FiEye size={15} />}
              </button>
            </div>
          </>
        )}

        <div className="file-upload">
          <label htmlFor="profile-pic-upload" className="upload-btn">
            <FiUpload size={16} /> {uploading ? 'Uploading...' : 'Upload Profile Picture'}
          </label>
          <input id="profile-pic-upload" type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
          {profilePic && (
            <div className="preview">
              <Image
                src={profilePic || '/default-avatar.svg'}
                alt="Profile preview"
                width={50}
                height={50}
                unoptimized
                style={{ width: '50px', height: '50px', borderRadius: '50%' }}
              />
            </div>
          )}
        </div>

        {error && <p style={{ color: '#ffabab' }}>{error}</p>}

        <button className="signupBtn" onClick={() => void signup()} disabled={loading}>
          <FiUserPlus size={18} /> {loading ? 'Creating account...' : 'Sign Up'}
        </button>
        <button className="loginBtn" onClick={() => router.push('/login')}>
          <FiLogIn size={18} /> Login
        </button>
      </div>
    </div>
  );
}