'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FiRss, FiLogIn, FiUserPlus, FiHeart, FiMessageCircle, FiSettings, FiUpload, FiSearch } from 'react-icons/fi';

interface Post {
  id: number;
  user_id: number;
  username: string;
  display_name: string;
  profile_pic: string;
  image_url: string;
  caption: string;
  like_count: number;
  is_liked: boolean;
  media_type: 'image' | 'video';
}

export default function Home() {
  const [token, setToken] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [caption, setCaption] = useState('');
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    setToken(storedToken);
    loadPosts(storedToken ?? undefined);
  }, []);

  const loadPosts = async (authToken?: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/posts', {
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
      });
      const data = await res.json();
      setPosts(data);
    } catch (error) {
      console.error('Failed to load posts:', error);
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
      formData.append('type', 'post');

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = (await res.json()) as { success?: boolean; url?: string; error?: string; details?: string };
      if (res.ok && data.success && data.url) {
        setMediaUrl(data.url);
        setMediaType(file.type.startsWith('video/') ? 'video' : 'image');
      } else {
        alert(`Upload failed: ${data.error || data.details || 'Please try a smaller file.'}`);
      }
    } catch {
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const post = async () => {
    if (!token || !mediaUrl.trim()) return;

    setPosting(true);
    try {
      await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ image_url: mediaUrl, media_type: mediaType, caption: caption }),
      });
      setMediaUrl('');
      setCaption('');
      setMediaType('image');
      loadPosts(token);
    } catch (error) {
      console.error('Failed to post:', error);
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="container">
      <div className="hero-card">
        <div>
          <p className="eyebrow">Luxury dark social</p>
          <h1 className="brand-title">HELKET</h1>
          <p className="brand-subtitle">
            Share photos, short clips, and private moments in a more polished Instagram-like feed.
          </p>
        </div>
        {token && <div className="status-pill">Signed in</div>}
      </div>

      {token && (
        <div className="navBar">
          <Link href="/" className="navButton">
            <FiRss size={16} /> Feed
          </Link>
          <Link href="/search" className="navButton">
            <FiSearch size={16} /> Search
          </Link>
          <Link href="/settings" className="navButton">
            <FiSettings size={16} /> Settings
          </Link>
        </div>
      )}

      {!token && (
        <div className="card auth-card" id="auth">
          <p className="eyebrow">Welcome</p>
          <h2>Login to unlock your feed</h2>
          <p className="muted-text">Search users, upload posts, share videos, and send private messages once you sign in.</p>
          <div className="button-group auth-actions">
            <Link href="/login" className="navButton">
              <FiLogIn size={16} /> Login
            </Link>
            <Link href="/signup" className="navButton">
              <FiUserPlus size={16} /> Sign Up
            </Link>
          </div>
        </div>
      )}

      {token && (
        <>
          <div className="card composer-card" id="postBox">
            <div className="composer-header">
              <div>
                <p className="eyebrow">Create</p>
                <h3>New post</h3>
              </div>
              <span className="composer-hint">{mediaUrl ? 'Media ready' : 'Photo or video'}</span>
            </div>
            <div className="file-upload">
              <label htmlFor="post-media-upload" className="upload-btn">
                <FiUpload size={16} /> {uploading ? 'Uploading...' : mediaUrl ? 'Change Media' : 'Upload Media'}
              </label>
              <input
                id="post-media-upload"
                type="file"
                accept="image/*,video/*"
                onChange={handleFileUpload}
                style={{ display: 'none' }}
              />
              {mediaUrl && (
                <div className="preview">
                  {mediaType === 'image' ? (
                    <Image
                      src={mediaUrl}
                      alt="Post preview"
                      width={100}
                      height={100}
                      unoptimized
                      style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '8px' }}
                    />
                  ) : (
                    <video src={mediaUrl} style={{ width: '120px', height: '90px', borderRadius: '8px' }} controls />
                  )}
                </div>
              )}
            </div>
            <input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Caption (optional)"
            />
            <div className="button-group">
              <button onClick={post} disabled={posting || !mediaUrl.trim()}>
                {posting ? 'Posting...' : 'Post'}
              </button>
            </div>
          </div>
        </>
      )}

      {token ? (
        <div id="feed">
          {loading && (
            <div className="skeleton-container">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="skeleton-post">
                  <div className="skeleton-header"></div>
                  <div className="skeleton-image"></div>
                  <div className="skeleton-caption"></div>
                  <div className="skeleton-actions"></div>
                </div>
              ))}
            </div>
          )}

          {!loading && posts.length === 0 && (
            <div className="empty-state">
              <p>No posts yet. Be the first to share something!</p>
            </div>
          )}

          {!loading && posts.map((p) => (
            <div key={p.id} className="post">
              <div className="user">
                <Image
                  src={p.profile_pic || '/default-avatar.svg'}
                  alt="Profile"
                  width={40}
                  height={40}
                  unoptimized
                />
                <div className="user-meta">
                  <b>
                    <Link href={`/profile/${p.user_id}`}>
                      {p.display_name || p.username}
                    </Link>
                  </b>
                  <span className="handle">@{p.username}</span>
                </div>
              </div>
              {p.media_type === 'video' ? (
                <video src={p.image_url} controls style={{ width: '100%', borderRadius: '12px' }} />
              ) : (
                <Image
                  src={p.image_url}
                  alt="Post"
                  width={800}
                  height={800}
                  unoptimized
                  style={{ width: '100%', height: 'auto' }}
                />
              )}
              <div className="caption">{p.caption}</div>
              <div className="actions">
                <button
                  className={`likeBtn ${p.is_liked ? 'liked' : ''}`}
                  disabled={!token}
                  onClick={() => toggleLike(p.id)}
                >
                  <FiHeart size={16} /> {p.like_count || 0}
                </button>
                <Link href={`/chat/${p.user_id}`}>
                  <button disabled={!token} className="chatBtn">
                    <FiMessageCircle size={16} /> Chat
                  </button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <p>Please login or sign up to view the feed.</p>
        </div>
      )}
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

