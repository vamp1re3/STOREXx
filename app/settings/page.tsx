'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FiSettings, FiUser, FiLock, FiShield, FiTrash2, FiSave, FiArrowLeft } from 'react-icons/fi';

interface User {
  id: number;
  username: string;
  display_name: string;
  profile_pic: string;
  email: string;
}

export default function Settings() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  // Profile settings
  const [displayName, setDisplayName] = useState('');
  const [profilePic, setProfilePic] = useState('');
  const [uploading, setUploading] = useState(false);

  // Privacy settings
  const [isPrivate, setIsPrivate] = useState(false);

  // Account settings
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    loadUserData();
  }, [router]);

  const loadUserData = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const userData = await res.json();
      setUser(userData);
      setDisplayName(userData.display_name || '');
      setProfilePic(userData.profile_pic || '');
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
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setProfilePic(data.url);
      } else {
        alert('Upload failed: ' + data.error);
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
      const token = localStorage.getItem('token');
      const res = await fetch('/api/profile/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          display_name: displayName,
          profile_pic: profilePic,
        }),
      });

      if (res.ok) {
        alert('Profile updated successfully!');
        loadUserData();
      } else {
        alert('Failed to update profile');
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
      const token = localStorage.getItem('token');
      const res = await fetch('/api/auth/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      if (res.ok) {
        alert('Password changed successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        const data = await res.json();
        alert('Failed to change password: ' + (data.error || 'Unknown error'));
      }
    } catch {
      alert('Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const deleteAccount = async () => {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/auth/delete-account', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        localStorage.removeItem('token');
        router.push('/');
      } else {
        alert('Failed to delete account');
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
    <div className="container">
      <div className="settings-header">
        <button onClick={() => router.push('/')} className="back-btn">
          <FiArrowLeft size={16} /> Back to Feed
        </button>
        <h1><FiSettings size={24} /> Settings</h1>
      </div>

      <div className="settings-container">
        <div className="settings-tabs">
          <button
            className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <FiUser size={16} /> Profile
          </button>
          <button
            className={`tab-btn ${activeTab === 'privacy' ? 'active' : ''}`}
            onClick={() => setActiveTab('privacy')}
          >
            <FiShield size={16} /> Privacy
          </button>
          <button
            className={`tab-btn ${activeTab === 'account' ? 'active' : ''}`}
            onClick={() => setActiveTab('account')}
          >
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
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your display name"
                />
              </div>

              <div className="form-group">
                <label>Profile Picture</label>
                <div className="file-upload">
                  <label htmlFor="profile-pic-upload" className="upload-btn">
                    {uploading ? 'Uploading...' : profilePic ? 'Change Picture' : 'Upload Picture'}
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
                  <input
                    type="checkbox"
                    checked={isPrivate}
                    onChange={(e) => setIsPrivate(e.target.checked)}
                  />
                  Private Account
                </label>
                <small>When enabled, only approved followers can see your posts</small>
              </div>

              <button onClick={() => alert('Privacy settings saved!')} className="save-btn">
                <FiSave size={16} /> Save Privacy Settings
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
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                <button onClick={changePassword} disabled={saving} className="save-btn">
                  <FiLock size={16} /> {saving ? 'Changing...' : 'Change Password'}
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
    </div>
  );
}