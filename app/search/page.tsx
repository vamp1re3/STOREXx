'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FiSearch, FiUser, FiFilm, FiArrowLeft } from 'react-icons/fi';
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
    } catch (err) {
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
      <h1><FiSearch size={26} /> Search</h1>

      <div className="card">
        <div className="message-input" style={{ padding: '10px' }}>
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
                <div key={u.id} className="post" style={{ padding: '12px' }}>
                  <Link href={`/profile/${u.id}`}>{u.display_name || u.username} (@{u.username})</Link>
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
                    <img src={p.profile_pic || 'https://via.placeholder.com/40'} alt="Profile" />
                    <div>
                      <b>{p.display_name || p.username}</b>
                      <div style={{ color: '#8f9bc5', fontSize: '0.85em' }}>@{p.username}</div>
                    </div>
                  </div>
                  {p.media_type === 'video' ? (
                    <video src={p.image_url} controls style={{ width: '100%', borderRadius: '10px' }} />
                  ) : (
                    <img src={p.image_url} alt="Post" style={{ width: '100%', borderRadius: '10px' }} />
                  )}
                  <p>{p.caption}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}