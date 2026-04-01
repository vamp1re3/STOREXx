'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiArrowLeft, FiEye, FiEyeOff, FiLock, FiLogOut, FiSave, FiSettings, FiShield, FiTrash2, FiUser } from 'react-icons/fi';

interface User {
  id: number;
  username: string;
  display_name: string;
  bio?: string;
  is_private?: boolean;
  profile_pic: string;
  email: string;
}

export default function Settings() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [profilePic, setProfilePic] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const router = useRouter();

  const getHeaders = (includeJson = false): HeadersInit => {
    const headers: HeadersInit = {};
    if (includeJson) {
      headers['Content-Type'] = 'application/json';
    }
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  };

  useEffect(() => {
    const verifySession = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        setToken(storedToken);
      }

      const res = await fetch('/api/auth/me', {
        headers: storedToken ? { Authorization: `Bearer ${storedToken}` } : {},
      });

      if (!res.ok) {
        router.replace('/login');
        return;
      }

      const userData = await res.json();
      setUser(userData);
      setDisplayName(userData.display_name || '');
      setBio(userData.bio || '');
      setProfilePic(userData.profile_pic || '');
      setIsPrivate(Boolean(userData.is_private));
      setLoading(false);
    };

    void verifySession();
  }, [router]);

  const loadUserData = async () => {
    try {
      const res = await fetch('/api/auth/me', {
        headers: getHeaders(),
      });

      if (!res.ok) {
        router.replace('/login');
        return;
      }

      const userData = await res.json();
      setUser(userData);
      setDisplayName(userData.display_name || '');
      setBio(userData.bio || '');
      setProfilePic(userData.profile_pic || '');
      setIsPrivate(Boolean(userData.is_private));
    } catch (error) {
      console.error('Failed to load user data:', error);
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
      formData.append('type', 'profile');

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: getHeaders(),
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

  const saveProfile = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const res = await fetch('/api/profile/update', {
        method: 'PUT',
        headers: getHeaders(true),
        body: JSON.stringify({
          display_name: displayName,
          profile_pic: profilePic,
          bio,
          is_private: isPrivate,
        }),
      });

      if (res.ok) {
        alert('Profile updated successfully.');
        await loadUserData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update profile');
      }
    } catch {
      alert('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (!newPassword || newPassword !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'PUT',
        headers: getHeaders(true),
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      if (res.ok) {
        alert('Password changed successfully.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        const data = await res.json();
        alert(`Failed to change password: ${data.error || 'Unknown error'}`);
      }
    } catch {
      alert('Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    localStorage.removeItem('token');
    router.push('/');
  };

  const deleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }

    try {
      const res = await fetch('/api/auth/delete-account', {
        method: 'DELETE',
        headers: getHeaders(),
      });

      if (res.ok) {
        localStorage.removeItem('token');
        router.push('/');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete account');
      }
    } catch {
      alert('Failed to delete account');
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="card">
          <p>Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container">
        <div className="card">
          <p>Please log in to access settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container page-with-mobile-nav">
      <div className="settings-header">
        <button onClick={() => router.push('/')} className="back-btn">
          <FiArrowLeft size={16} /> Back to Feed
        </button>
        <h1><FiSettings size={24} /> Settings</h1>
      </div>

      <div className="settings-container">
        <div className="settings-tabs">
          <button className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
            <FiUser size={16} /> Profile
          </button>
          <button className={`tab-btn ${activeTab === 'privacy' ? 'active' : ''}`} onClick={() => setActiveTab('privacy')}>
            <FiShield size={16} /> Privacy
          </button>
          <button className={`tab-btn ${activeTab === 'account' ? 'active' : ''}`} onClick={() => setActiveTab('account')}>
            <FiLock size={16} /> Account
          </button>
        </div>

        <div className="settings-content">
          {activeTab === 'profile' && (
            <div className="settings-section">
              <h2>Profile Settings</h2>
              <div className="form-group">
                <label>Username</label>
                <input value={user.username} disabled />
                <small>This cannot be changed</small>
              </div>

              <div className="form-group">
                <label>Display Name</label>
                <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Enter your display name" />
              </div>

              <div className="form-group">
                <label>Bio</label>
                <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell people a little about yourself" maxLength={280} />
                <small>{bio.length}/280 characters</small>
              </div>

              <div className="form-group">
                <label>Profile Picture</label>
                <div className="file-upload">
                  <label htmlFor="profile-pic-upload" className="upload-btn">
                    {uploading ? 'Uploading...' : profilePic ? 'Change Picture' : 'Upload Picture'}
                  </label>
                  <input id="profile-pic-upload" type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
                  {profilePic && (
                    <div className="preview">
                      <Image
                        src={profilePic}
                        alt="Profile preview"
                        width={80}
                        height={80}
                        unoptimized
                        style={{ width: '80px', height: '80px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <button onClick={saveProfile} disabled={saving} className="save-btn">
                <FiSave size={16} /> {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="settings-section">
              <h2>Privacy Settings</h2>
              <div className="form-group">
                <label className="checkbox-label">
                  <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)} />
                  Private Account
                </label>
                <small>When enabled, only followers can view your posts and videos.</small>
              </div>

              <button onClick={saveProfile} disabled={saving} className="save-btn">
                <FiSave size={16} /> {saving ? 'Saving...' : 'Save Privacy Settings'}
              </button>
            </div>
          )}

          {activeTab === 'account' && (
            <div className="settings-section">
              <h2>Account Settings</h2>

              <div className="subsection">
                <h3>Change Password</h3>
                <div className="form-group">
                  <label>Current Password</label>
                  <div className="password-field">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                    <button type="button" className="password-toggle" onClick={() => setShowCurrentPassword((value) => !value)}>
                      {showCurrentPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                      {showCurrentPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
                <div className="form-group">
                  <label>New Password</label>
                  <div className="password-field">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <button type="button" className="password-toggle" onClick={() => setShowNewPassword((value) => !value)}>
                      {showNewPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                      {showNewPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
                <div className="form-group">
                  <label>Confirm New Password</label>
                  <div className="password-field">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <button type="button" className="password-toggle" onClick={() => setShowConfirmPassword((value) => !value)}>
                      {showConfirmPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                      {showConfirmPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
                <button onClick={changePassword} disabled={saving} className="save-btn">
                  <FiLock size={16} /> {saving ? 'Changing...' : 'Change Password'}
                </button>
              </div>

              <div className="subsection">
                <h3>Session</h3>
                <p>Sign out from this device and keep your profile secure.</p>
                <button onClick={logout} className="save-btn">
                  <FiLogOut size={16} /> Logout
                </button>
              </div>

              <div className="subsection danger-zone">
                <h3>Danger Zone</h3>
                <p>Once you delete your account, there is no going back. Please be certain.</p>
                <button onClick={deleteAccount} className="delete-btn">
                  <FiTrash2 size={16} /> Delete Account
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mobile-bottom-nav">
        <button onClick={() => router.push('/')} className="navButton">Feed</button>
        <button onClick={() => router.push('/search')} className="navButton">Search</button>
        <button onClick={() => router.push('/settings')} className="navButton">Settings</button>
      </div>
    </div>
  );
}
