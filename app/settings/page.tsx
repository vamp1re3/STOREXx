'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiArrowLeft, FiEye, FiEyeOff, FiFlag, FiHome, FiLock, FiLogOut, FiMessageCircle, FiPackage, FiSave, FiSearch, FiSettings, FiShield, FiShoppingCart, FiTrash2, FiUpload, FiUser, FiUsers, FiVolume2, FiVolumeX, FiX } from 'react-icons/fi';

interface User {
  id: number;
  username: string;
  display_name: string;
  bio?: string;
  is_private?: boolean;
  roles?: string[];
  current_mode?: string;
  profile_pic: string;
  email: string;
  email_verified: boolean;
  account_status: string;
}

interface Restriction {
  id: number;
  restricted_id: number;
  username: string;
  display_name: string;
}

interface Block {
  id: number;
  blocked_id: number;
  username: string;
  display_name: string;
}

interface CloseFriend {
  id: number;
  friend_id: number;
  username: string;
  display_name: string;
  profile_pic: string;
}

interface Conversation {
  id: number;
  other_user_id: number;
  username: string;
  display_name: string;
  profile_pic: string;
  muted: boolean;
  theme: string;
  background?: string;
}

export default function Settings() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  // Profile state
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [profilePic, setProfilePic] = useState('');
  const [uploading, setUploading] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Privacy state
  const [restrictions, setRestrictions] = useState<Restriction[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [restrictUsername, setRestrictUsername] = useState('');
  const [blockUsername, setBlockUsername] = useState('');

  // Reports & Feedback state
  const [feedbackType, setFeedbackType] = useState('general');
  const [feedbackContent, setFeedbackContent] = useState('');
  const [reportReason, setReportReason] = useState('');
  const [reportUsername, setReportUsername] = useState('');

  // Chat Settings state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [chatTheme, setChatTheme] = useState('default');
  const [chatBackground, setChatBackground] = useState('');

  // Account state
  const [closeFriends, setCloseFriends] = useState<CloseFriend[]>([]);
  const [addFriendUsername, setAddFriendUsername] = useState('');

  // Role management state
  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [currentMode, setCurrentMode] = useState<string>('buyer');
  const [switchingMode, setSwitchingMode] = useState(false);
  const [addingRole, setAddingRole] = useState(false);

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
      setUserRoles(userData.roles || []);
      setCurrentMode(userData.current_mode || 'buyer');

      // Load additional data
      await loadRestrictions();
      await loadBlocks();
      await loadCloseFriends();
      await loadConversations();

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
      setUserRoles(userData.roles || []);
      setCurrentMode(userData.current_mode || 'buyer');
    } catch (error) {
      console.error('Failed to load user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRestrictions = async () => {
    try {
      const res = await fetch('/api/restrictions', {
        headers: getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setRestrictions(data);
      }
    } catch (error) {
      console.error('Failed to load restrictions:', error);
    }
  };

  const loadBlocks = async () => {
    try {
      const res = await fetch('/api/blocks', {
        headers: getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setBlocks(data);
      }
    } catch (error) {
      console.error('Failed to load blocks:', error);
    }
  };

  const loadCloseFriends = async () => {
    try {
      const res = await fetch('/api/close-friends', {
        headers: getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setCloseFriends(data);
      }
    } catch (error) {
      console.error('Failed to load close friends:', error);
    }
  };

  const loadConversations = async () => {
    try {
      const res = await fetch('/api/conversations', {
        headers: getHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
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

  // Privacy functions
  const restrictUser = async () => {
    if (!restrictUsername.trim()) return;

    try {
      const res = await fetch('/api/restrictions', {
        method: 'POST',
        headers: getHeaders(true),
        body: JSON.stringify({ username: restrictUsername }),
      });

      if (res.ok) {
        alert('User restricted successfully');
        setRestrictUsername('');
        await loadRestrictions();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to restrict user');
      }
    } catch (error) {
      alert('Failed to restrict user');
    }
  };

  const unrestrictUser = async (restrictionId: number) => {
    try {
      const res = await fetch(`/api/restrictions?id=${restrictionId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });

      if (res.ok) {
        await loadRestrictions();
      } else {
        alert('Failed to unrestrict user');
      }
    } catch (error) {
      alert('Failed to unrestrict user');
    }
  };

  const blockUser = async () => {
    if (!blockUsername.trim()) return;

    try {
      const res = await fetch('/api/blocks', {
        method: 'POST',
        headers: getHeaders(true),
        body: JSON.stringify({ username: blockUsername }),
      });

      if (res.ok) {
        alert('User blocked successfully');
        setBlockUsername('');
        await loadBlocks();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to block user');
      }
    } catch (error) {
      alert('Failed to block user');
    }
  };

  const unblockUser = async (blockId: number) => {
    try {
      const res = await fetch(`/api/blocks?id=${blockId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });

      if (res.ok) {
        await loadBlocks();
      } else {
        alert('Failed to unblock user');
      }
    } catch (error) {
      alert('Failed to unblock user');
    }
  };

  // Reports & Feedback functions
  const submitFeedback = async () => {
    if (!feedbackContent.trim()) return;

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: getHeaders(true),
        body: JSON.stringify({
          type: feedbackType,
          content: feedbackContent,
        }),
      });

      if (res.ok) {
        alert('Feedback submitted successfully');
        setFeedbackContent('');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to submit feedback');
      }
    } catch (error) {
      alert('Failed to submit feedback');
    }
  };

  const submitReport = async () => {
    if (!reportUsername.trim() || !reportReason.trim()) return;

    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: getHeaders(true),
        body: JSON.stringify({
          username: reportUsername,
          reason: reportReason,
        }),
      });

      if (res.ok) {
        alert('Report submitted successfully');
        setReportUsername('');
        setReportReason('');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to submit report');
      }
    } catch (error) {
      alert('Failed to submit report');
    }
  };

  // Chat Settings functions
  const updateConversationSettings = async (conversationId: number, updates: { muted?: boolean; theme?: string; background?: string }) => {
    try {
      const res = await fetch(`/api/conversations/${conversationId}`, {
        method: 'PUT',
        headers: getHeaders(true),
        body: JSON.stringify(updates),
      });

      if (res.ok) {
        await loadConversations();
        if (selectedConversation?.id === conversationId) {
          setSelectedConversation(prev => prev ? { ...prev, ...updates } : null);
        }
      } else {
        alert('Failed to update conversation settings');
      }
    } catch (error) {
      alert('Failed to update conversation settings');
    }
  };

  // Account functions
  const addCloseFriend = async () => {
    if (!addFriendUsername.trim()) return;

    try {
      const res = await fetch('/api/close-friends', {
        method: 'POST',
        headers: getHeaders(true),
        body: JSON.stringify({ username: addFriendUsername }),
      });

      if (res.ok) {
        alert('Close friend added successfully');
        setAddFriendUsername('');
        await loadCloseFriends();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to add close friend');
      }
    } catch (error) {
      alert('Failed to add close friend');
    }
  };

  const removeCloseFriend = async (friendId: number) => {
    try {
      const res = await fetch(`/api/close-friends?id=${friendId}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });

      if (res.ok) {
        await loadCloseFriends();
      } else {
        alert('Failed to remove close friend');
      }
    } catch (error) {
      alert('Failed to remove close friend');
    }
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

  // Role management functions
  const switchMode = async (mode: string) => {
    if (mode === currentMode) return;

    setSwitchingMode(true);
    try {
      const res = await fetch('/api/auth/switch-mode', {
        method: 'POST',
        headers: getHeaders(true),
        body: JSON.stringify({ mode }),
      });

      if (res.ok) {
        setCurrentMode(mode);
        alert(`Switched to ${mode} mode successfully`);
        // Update theme
        document.body.className = `${mode}-theme`;
        localStorage.setItem('user_mode', mode);
        window.dispatchEvent(new Event('themeChange'));
        // Reload page to apply new UI theme
        window.location.reload();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to switch mode');
      }
    } catch (error) {
      alert('Failed to switch mode');
    } finally {
      setSwitchingMode(false);
    }
  };

  const addRole = async (role: string) => {
    if (userRoles.includes(role)) return;

    setAddingRole(true);
    try {
      const res = await fetch('/api/auth/add-role', {
        method: 'POST',
        headers: getHeaders(true),
        body: JSON.stringify({ role }),
      });

      if (res.ok) {
        setUserRoles(prev => [...prev, role]);
        alert(`Added ${role} role successfully`);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to add role');
      }
    } catch (error) {
      alert('Failed to add role');
    } finally {
      setAddingRole(false);
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
      <div className="settings-header top-bar-row">
        <button onClick={() => router.push('/')} className="back-btn">
          <FiArrowLeft size={16} /> Back to Feed
        </button>
        <h1><FiSettings size={24} /> Settings</h1>
        <Link href="/chat" className="top-chat-button" aria-label="Open chats" title="Chats">
          <FiMessageCircle size={18} />
        </Link>
      </div>

      <div className="settings-container">
        <div className="settings-tabs">
          <button className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
            <FiUser size={16} /> Profile
          </button>
          <button className={`tab-btn ${activeTab === 'privacy' ? 'active' : ''}`} onClick={() => setActiveTab('privacy')}>
            <FiShield size={16} /> Privacy
          </button>
          <button className={`tab-btn ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => setActiveTab('reports')}>
            <FiFlag size={16} /> Reports & Feedback
          </button>
          <button className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')}>
            <FiMessageCircle size={16} /> Chat Settings
          </button>
          <button className={`tab-btn ${activeTab === 'account' ? 'active' : ''}`} onClick={() => setActiveTab('account')}>
            <FiUser size={16} /> Account
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
                  <label
                    htmlFor="profile-pic-upload"
                    className="upload-btn icon-only"
                    aria-label={uploading ? 'Uploading picture' : profilePic ? 'Change picture' : 'Upload picture'}
                    title={uploading ? 'Uploading picture' : profilePic ? 'Change picture' : 'Upload picture'}
                  >
                    <FiUpload size={16} />
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

              <div className="subsection">
                <h3>Restricted Accounts</h3>
                <p>Restrict accounts to limit what they can see and do on your profile without blocking them completely.</p>
                <div className="form-group">
                  <input
                    type="text"
                    placeholder="Enter username to restrict"
                    value={restrictUsername}
                    onChange={(e) => setRestrictUsername(e.target.value)}
                  />
                  <button onClick={restrictUser} className="save-btn" style={{ marginLeft: '10px' }}>
                    Restrict
                  </button>
                </div>
                {restrictions.length > 0 && (
                  <div className="user-list">
                    <h4>Restricted Users</h4>
                    {restrictions.map((restriction) => (
                      <div key={restriction.id} className="user-item">
                        <span>{restriction.display_name} (@{restriction.username})</span>
                        <button onClick={() => unrestrictUser(restriction.id)} className="remove-btn">
                          <FiX size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="subsection danger-zone">
                <h3>Blocked Accounts</h3>
                <p>Blocked accounts cannot see your profile, posts, or contact you.</p>
                <div className="form-group">
                  <input
                    type="text"
                    placeholder="Enter username to block"
                    value={blockUsername}
                    onChange={(e) => setBlockUsername(e.target.value)}
                  />
                  <button onClick={blockUser} className="delete-btn" style={{ marginLeft: '10px' }}>
                    Block
                  </button>
                </div>
                {blocks.length > 0 && (
                  <div className="user-list">
                    <h4>Blocked Users</h4>
                    {blocks.map((block) => (
                      <div key={block.id} className="user-item">
                        <span>{block.display_name} (@{block.username})</span>
                        <button onClick={() => unblockUser(block.id)} className="remove-btn">
                          <FiX size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="settings-section">
              <h2>Reports & Feedback</h2>

              <div className="subsection">
                <h3>Submit Feedback</h3>
                <p>Help us improve HELKET by sharing your thoughts and suggestions.</p>
                <div className="form-group">
                  <label>Feedback Type</label>
                  <select value={feedbackType} onChange={(e) => setFeedbackType(e.target.value)}>
                    <option value="general">General Feedback</option>
                    <option value="bug">Bug Report</option>
                    <option value="feature">Feature Request</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Your Feedback</label>
                  <textarea
                    value={feedbackContent}
                    onChange={(e) => setFeedbackContent(e.target.value)}
                    placeholder="Tell us what you think..."
                    maxLength={1000}
                    rows={4}
                  />
                  <small>{feedbackContent.length}/1000 characters</small>
                </div>
                <button onClick={submitFeedback} disabled={!feedbackContent.trim()} className="save-btn">
                  <FiSave size={16} /> Submit Feedback
                </button>
              </div>

              <div className="subsection">
                <h3>Report a User</h3>
                <p>Report users who violate our community guidelines.</p>
                <div className="form-group">
                  <label>Username to Report</label>
                  <input
                    type="text"
                    placeholder="Enter username"
                    value={reportUsername}
                    onChange={(e) => setReportUsername(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>Reason for Report</label>
                  <textarea
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    placeholder="Describe the issue..."
                    maxLength={500}
                    rows={3}
                  />
                  <small>{reportReason.length}/500 characters</small>
                </div>
                <button onClick={submitReport} disabled={!reportUsername.trim() || !reportReason.trim()} className="save-btn">
                  <FiFlag size={16} /> Submit Report
                </button>
              </div>
            </div>
          )}

          {activeTab === 'chat' && (
            <div className="settings-section">
              <h2>Chat Settings</h2>

              <div className="subsection">
                <h3>Conversation Management</h3>
                <p>Manage your chat conversations and their settings.</p>
                {conversations.length > 0 ? (
                  <div className="conversation-list">
                    {conversations.map((conversation) => (
                      <div key={conversation.id} className="conversation-item">
                        <div className="conversation-info">
                          <Image
                            src={conversation.profile_pic || '/default-avatar.png'}
                            alt={conversation.display_name}
                            width={40}
                            height={40}
                            unoptimized
                            style={{ borderRadius: '50%', marginRight: '10px' }}
                          />
                          <div>
                            <strong>{conversation.display_name}</strong>
                            <br />
                            <small>@{conversation.username}</small>
                          </div>
                        </div>
                        <div className="conversation-controls">
                          <button
                            onClick={() => updateConversationSettings(conversation.id, { muted: !conversation.muted })}
                            className={`mute-btn ${conversation.muted ? 'muted' : ''}`}
                            title={conversation.muted ? 'Unmute conversation' : 'Mute conversation'}
                          >
                            {conversation.muted ? <FiVolumeX size={16} /> : <FiVolume2 size={16} />}
                          </button>
                          <select
                            value={conversation.theme}
                            onChange={(e) => updateConversationSettings(conversation.id, { theme: e.target.value })}
                            className="theme-select"
                          >
                            <option value="default">Default</option>
                            <option value="dark">Dark</option>
                            <option value="blue">Blue</option>
                            <option value="green">Green</option>
                            <option value="purple">Purple</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p>No conversations yet.</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'account' && (
            <div className="settings-section">
              <h2>Account Settings</h2>

              <div className="subsection">
                <h3>Account Status</h3>
                <div className="form-group">
                  <label>Email</label>
                  <input value={user.email} disabled />
                  <small>
                    {user.email_verified ? '✓ Email verified' : '⚠ Email not verified'}
                    {!user.email_verified && (
                      <button
                        onClick={() => router.push('/verify-email')}
                        className="link-btn"
                        style={{ marginLeft: '10px' }}
                      >
                        Verify Email
                      </button>
                    )}
                  </small>
                </div>
                <div className="form-group">
                  <label>Account Status</label>
                  <input value={user.account_status} disabled />
                  <small>Your account is {user.account_status}</small>
                </div>
              </div>

              <div className="subsection">
                <h3>Close Friends</h3>
                <p>Share stories exclusively with your close friends.</p>
                <div className="form-group">
                  <input
                    type="text"
                    placeholder="Enter username to add as close friend"
                    value={addFriendUsername}
                    onChange={(e) => setAddFriendUsername(e.target.value)}
                  />
                  <button onClick={addCloseFriend} className="save-btn" style={{ marginLeft: '10px' }}>
                    Add Friend
                  </button>
                </div>
                {closeFriends.length > 0 && (
                  <div className="user-list">
                    <h4>Your Close Friends</h4>
                    {closeFriends.map((friend) => (
                      <div key={friend.id} className="user-item">
                        <Image
                          src={friend.profile_pic || '/default-avatar.png'}
                          alt={friend.display_name}
                          width={30}
                          height={30}
                          unoptimized
                          style={{ borderRadius: '50%', marginRight: '10px' }}
                        />
                        <span>{friend.display_name} (@{friend.username})</span>
                        <button onClick={() => removeCloseFriend(friend.id)} className="remove-btn">
                          <FiX size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

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
                    <button
                      type="button"
                      className="password-toggle"
                      aria-label={showCurrentPassword ? 'Hide password' : 'Show password'}
                      title={showCurrentPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowCurrentPassword((value) => !value)}
                    >
                      {showCurrentPassword ? <FiEyeOff size={15} /> : <FiEye size={15} />}
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
                    <button
                      type="button"
                      className="password-toggle"
                      aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                      title={showNewPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowNewPassword((value) => !value)}
                    >
                      {showNewPassword ? <FiEyeOff size={15} /> : <FiEye size={15} />}
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

          {activeTab === 'account' && (
            <div className="settings-section">
              <h2>Account Management</h2>

              <div className="subsection">
                <h3>Account Mode</h3>
                <p>Switch between your buyer and seller experiences. Current mode: <strong>{currentMode}</strong></p>
                <div className="mode-switcher">
                  <button
                    onClick={() => switchMode('buyer')}
                    className={`mode-btn ${currentMode === 'buyer' ? 'active' : ''}`}
                    disabled={switchingMode || !userRoles.includes('buyer')}
                  >
                    🛒 Buyer Mode
                  </button>
                  <button
                    onClick={() => switchMode('seller')}
                    className={`mode-btn ${currentMode === 'seller' ? 'active' : ''}`}
                    disabled={switchingMode || !userRoles.includes('seller')}
                  >
                    🏪 Seller Mode
                  </button>
                </div>
                {switchingMode && <p>Switching mode...</p>}
              </div>

              <div className="subsection">
                <h3>Your Roles</h3>
                <p>You have access to the following account types:</p>
                <div className="roles-list">
                  {userRoles.map(role => (
                    <span key={role} className="role-badge">
                      {role === 'buyer' ? '🛒' : '🏪'} {role.charAt(0).toUpperCase() + role.slice(1)}
                    </span>
                  ))}
                </div>
              </div>

              <div className="subsection">
                <h3>Add Account Type</h3>
                <p>Get access to additional features by adding more account types:</p>
                <div className="add-role-section">
                  {!userRoles.includes('buyer') && (
                    <button
                      onClick={() => addRole('buyer')}
                      className="add-role-btn"
                      disabled={addingRole}
                    >
                      🛒 Add Buyer Account
                    </button>
                  )}
                  {!userRoles.includes('seller') && (
                    <button
                      onClick={() => addRole('seller')}
                      className="add-role-btn"
                      disabled={addingRole}
                    >
                      🏪 Add Seller Account
                    </button>
                  )}
                </div>
                {addingRole && <p>Adding role...</p>}
              </div>

              <div className="subsection danger-zone">
                <h3>Danger Zone</h3>
                <button onClick={deleteAccount} className="delete-btn">
                  <FiTrash2 size={16} /> Delete Account
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mobile-bottom-nav">
        <button onClick={() => router.push('/')} className="navButton">
          <FiHome size={16} />
          <span>Feed</span>
        </button>
        <button onClick={() => router.push('/search')} className="navButton">
          <FiSearch size={16} />
          <span>Search</span>
        </button>
        {currentMode === 'buyer' && (
          <>
            <button onClick={() => router.push('/cart')} className="navButton">
              <FiShoppingCart size={16} />
              <span>Cart</span>
            </button>
            <button onClick={() => router.push('/buyer-orders')} className="navButton">
              <FiPackage size={16} />
              <span>Orders</span>
            </button>
          </>
        )}
        {currentMode === 'seller' && (
          <button onClick={() => router.push('/seller-orders')} className="navButton">
            <FiPackage size={16} />
            <span>Sales</span>
          </button>
        )}
        <button onClick={() => router.push('/settings')} className="navButton">
          <FiSettings size={16} />
          <span>Settings</span>
        </button>
      </div>
    </div>
  );
}
