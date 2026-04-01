'use client';

import Image from 'next/image';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FiSearch, FiUser, FiFilm, FiArrowLeft, FiMessageCircle } from 'react-icons/fi';
import { useRouter } from 'next/navigation';

interface UserResult { id: number; username: string; display_name: string; profile_pic: string; }
interface PostResult { id: number; user_id: number; username: string; display_name: string; profile_pic: string; image_url: string; media_type: string; caption: string; }

export default function Search() {
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<UserResult[]>([]);
  const [posts, setPosts] = useState<PostResult[]>([]);
  const [videos, setVideos] = useState<PostResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
    }
  }, [router]);

  const doSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
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
  };

  return (
    <div className="container">
      <button onClick={() => router.push('/')} className="back-btn">
        <FiArrowLeft size={16} /> Back to Feed
      </button>
      <div className="card search-shell">
        <p className="eyebrow">Discover</p>
        <h1><FiSearch size={26} /> Search</h1>
        <p className="brand-subtitle">Find people, photo posts, and videos like a polished explore page.</p>

        <div className="message-input" style={{ padding: '10px 0' }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search users, posts, videos..."
            onKeyDown={(e) => e.key === 'Enter' && doSearch()}
          />
          <button onClick={doSearch} className="navButton">
            <FiSearch size={16} /> Search
          </button>
        </div>

        {loading && <p>Loading results...</p>}
        {error && <p style={{ color: '#ffabab' }}>{error}</p>}

        {users.length > 0 && (
          <div>
            <h2><FiUser size={16} /> Users</h2>
            <div className="profile-list">
              {users.map((u) => (
                <div key={u.id} className="post result-user-card" style={{ padding: '12px' }}>
                  <div className="user">
                    <Image
                      src={u.profile_pic || '/default-avatar.svg'}
                      alt="Profile"
                      width={44}
                      height={44}
                      unoptimized
                    />
                    <div className="user-meta">
                      <b>{u.display_name || u.username}</b>
                      <span className="handle">@{u.username}</span>
                    </div>
                  </div>
                  <div className="button-group">
                    <Link href={`/profile/${u.id}`} className="navButton">View profile</Link>
                    <Link href={`/chat/${u.id}`} className="chatBtn">
                      <FiMessageCircle size={16} /> Chat
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {posts.length > 0 && (
          <div>
            <h2><FiFilm size={16} /> Posts</h2>
            <div className="feed-list">
              {posts.map((p) => (
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
                      <b>{p.display_name || p.username}</b>
                      <span className="handle">@{p.username}</span>
                    </div>
                  </div>
                  {p.media_type === 'video' ? (
                    <video src={p.image_url} controls style={{ width: '100%', borderRadius: '10px' }} />
                  ) : (
                    <Image
                      src={p.image_url}
                      alt="Post"
                      width={800}
                      height={800}
                      unoptimized
                      style={{ width: '100%', height: 'auto', borderRadius: '10px' }}
                    />
                  )}
                  <p>{p.caption}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {videos.length > 0 && (
          <div>
            <h2><FiFilm size={16} /> Videos</h2>
            <div className="feed-list">
              {videos.map((v) => (
                <div key={`video-${v.id}`} className="post">
                  <div className="user">
                    <Image
                      src={v.profile_pic || '/default-avatar.svg'}
                      alt="Profile"
                      width={40}
                      height={40}
                      unoptimized
                    />
                    <div className="user-meta">
                      <b>{v.display_name || v.username}</b>
                      <span className="handle">@{v.username}</span>
                    </div>
                  </div>
                  <video src={v.image_url} controls style={{ width: '100%', borderRadius: '10px' }} />
                  <p>{v.caption}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}