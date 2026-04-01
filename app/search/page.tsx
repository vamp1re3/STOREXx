'use client';

import Image from 'next/image';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { FiArrowLeft, FiFilm, FiMessageCircle, FiSearch, FiUser } from 'react-icons/fi';
import { useRouter } from 'next/navigation';

interface UserResult {
  id: number;
  username: string;
  display_name: string;
  profile_pic: string;
}

interface PostResult {
  id: number;
  user_id: number;
  username: string;
  display_name: string;
  profile_pic: string;
  image_url: string;
  media_type: string;
  caption: string;
}

type SearchTab = 'users' | 'posts' | 'videos';

export default function Search() {
  const [token, setToken] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<UserResult[]>([]);
  const [posts, setPosts] = useState<PostResult[]>([]);
  const [videos, setVideos] = useState<PostResult[]>([]);
  const [activeTab, setActiveTab] = useState<SearchTab>('users');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const verifySession = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        setToken(storedToken);
        setReady(true);
        return;
      }

      const res = await fetch('/api/auth/me');
      if (!res.ok) {
        router.replace('/login');
        return;
      }

      setReady(true);
    };

    void verifySession();
  }, [router]);

  const getHeaders = useCallback((): HeadersInit => (token ? { Authorization: `Bearer ${token}` } : {}), [token]);

  const doSearch = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
        headers: getHeaders(),
      });
      const data = await res.json();
      if (res.ok) {
        setUsers(data.users || []);
        setPosts(data.posts || []);
        setVideos(data.videos || []);
      } else {
        setError(data.error || 'Search failed');
      }
    } catch {
      setError('Search request failed');
    } finally {
      setLoading(false);
    }
  }, [query, getHeaders]);

  useEffect(() => {
    if (!ready) {
      return;
    }

    if (!query.trim()) {
      setUsers([]);
      setPosts([]);
      setVideos([]);
      setError('');
      return;
    }

    const timeout = window.setTimeout(() => {
      void doSearch();
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [query, ready, doSearch]);

  const noResults = query.trim() && !loading && users.length === 0 && posts.length === 0 && videos.length === 0;

  return (
    <div className="container page-with-mobile-nav">
      <div className="top-bar-row">
        <button onClick={() => router.push('/')} className="back-btn">
          <FiArrowLeft size={16} /> Back to Feed
        </button>
        <Link href="/chat" className="top-chat-button" aria-label="Open chats" title="Chats">
          <FiMessageCircle size={18} />
        </Link>
      </div>
      <div className="card search-shell">
        <p className="eyebrow">Discover</p>
        <h1><FiSearch size={26} /> Search</h1>
        <p className="brand-subtitle">Find people, photo posts, and videos with a faster explore-style search.</p>

        <div className="message-input" style={{ padding: '10px 0' }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search users, posts, videos..."
            onKeyDown={(e) => e.key === 'Enter' && void doSearch()}
          />
          <button onClick={() => void doSearch()} className="navButton">
            <FiSearch size={16} /> Search
          </button>
        </div>

        <div className="search-tabs-inline">
          <button className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
            <FiUser size={16} /> Users
          </button>
          <button className={`tab-btn ${activeTab === 'posts' ? 'active' : ''}`} onClick={() => setActiveTab('posts')}>
            <FiFilm size={16} /> Posts
          </button>
          <button className={`tab-btn ${activeTab === 'videos' ? 'active' : ''}`} onClick={() => setActiveTab('videos')}>
            <FiFilm size={16} /> Videos
          </button>
        </div>

        {loading && <p>Loading results...</p>}
        {error && <p style={{ color: '#ffabab' }}>{error}</p>}
        {noResults && <div className="empty-state"><p>No results found for “{query}”.</p></div>}

        {activeTab === 'users' && users.length > 0 && (
          <div>
            <h2><FiUser size={16} /> Users</h2>
            <div className="profile-list">
              {users.map((user) => (
                <div key={user.id} className="post result-user-card" style={{ padding: '12px' }}>
                  <div className="user">
                    <Image
                      src={user.profile_pic || '/default-avatar.svg'}
                      alt="Profile"
                      width={44}
                      height={44}
                      unoptimized
                    />
                    <div className="user-meta">
                      <b>{user.display_name || user.username}</b>
                      <span className="handle">@{user.username}</span>
                    </div>
                  </div>
                  <div className="button-group">
                    <Link href={`/profile/${user.id}`} className="navButton">View profile</Link>
                    <Link href={`/chat/${user.id}`} className="chatBtn">
                      <FiMessageCircle size={16} /> Chat
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'posts' && posts.length > 0 && (
          <div>
            <h2><FiFilm size={16} /> Posts</h2>
            <div className="feed-list">
              {posts.map((post) => (
                <div key={post.id} className="post media-post-card">
                  <div className="user">
                    <Image
                      src={post.profile_pic || '/default-avatar.svg'}
                      alt="Profile"
                      width={40}
                      height={40}
                      unoptimized
                    />
                    <div className="user-meta">
                      <b>{post.display_name || post.username}</b>
                      <span className="handle">@{post.username}</span>
                    </div>
                  </div>
                  {post.media_type === 'video' ? (
                    <video src={post.image_url} controls style={{ width: '100%', borderRadius: '10px' }} />
                  ) : (
                    <Image
                      src={post.image_url}
                      alt="Post"
                      width={800}
                      height={800}
                      unoptimized
                      style={{ width: '100%', height: 'auto', borderRadius: '10px' }}
                    />
                  )}
                  <p className="caption">{post.caption}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'videos' && videos.length > 0 && (
          <div>
            <h2><FiFilm size={16} /> Videos</h2>
            <div className="feed-list">
              {videos.map((video) => (
                <div key={`video-${video.id}`} className="post media-post-card">
                  <div className="user">
                    <Image
                      src={video.profile_pic || '/default-avatar.svg'}
                      alt="Profile"
                      width={40}
                      height={40}
                      unoptimized
                    />
                    <div className="user-meta">
                      <b>{video.display_name || video.username}</b>
                      <span className="handle">@{video.username}</span>
                    </div>
                  </div>
                  <video src={video.image_url} controls style={{ width: '100%', borderRadius: '10px' }} />
                  <p className="caption">{video.caption}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mobile-bottom-nav">
        <Link href="/" className="navButton">Feed</Link>
        <Link href="/search" className="navButton">Search</Link>
        <Link href="/settings" className="navButton">Settings</Link>
      </div>
    </div>
  );
}
