'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FiMessageCircle } from 'react-icons/fi';

interface User {
  id: number;
  username: string;
  display_name: string;
  profile_pic: string;
  bio?: string;
  is_private?: boolean;
  created_at: string;
}

interface ConnectionUser {
  id: number;
  username: string;
  display_name: string;
  profile_pic: string;
}

interface Post {
  id: number;
  image_url: string;
  caption: string;
  media_type?: 'image' | 'video';
}

interface ProfileData {
  user: User;
  posts: Post[];
  followers: number;
  following: number;
  followersList: ConnectionUser[];
  followingList: ConnectionUser[];
  isFollowing: boolean;
  isBlocked: boolean;
  isBlockedBy: boolean;
  canViewPosts: boolean;
}

export default function Profile() {
  const { userId } = useParams();
  const [token, setToken] = useState<string | null>(null);
  const [data, setData] = useState<ProfileData | null>(null);
  const [activeList, setActiveList] = useState<'followers' | 'following' | null>(null);
  const router = useRouter();

  const getHeaders = useCallback((): HeadersInit => (token ? { Authorization: `Bearer ${token}` } : {}), [token]);

  const loadProfile = useCallback(async () => {
    const res = await fetch(`/api/profile/${userId}`, {
      headers: getHeaders(),
    });
    const profileData = await res.json();
    setData(profileData);
  }, [getHeaders, userId]);

  useEffect(() => {
    const verifySession = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        setToken(storedToken);
        return;
      }

      const res = await fetch('/api/auth/me');
      if (!res.ok) {
        router.replace('/login');
      }
    };

    void verifySession();
  }, [router]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadProfile();
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [loadProfile]);

  const toggleFollow = async () => {
    await fetch(`/api/follow/${userId}`, {
      method: 'POST',
      headers: getHeaders(),
    });
    await loadProfile();
  };

  const toggleBlock = async () => {
    await fetch(`/api/blocks/${userId}`, {
      method: data?.isBlocked ? 'DELETE' : 'POST',
      headers: getHeaders(),
    });
    await loadProfile();
  };

  if (!data) return <div className="container"><div className="card">Loading profile...</div></div>;

  const visibleConnections = activeList === 'followers' ? data.followersList : data.followingList;

  return (
    <div className="container page-with-mobile-nav">
      <div className="top-bar-row">
        <button onClick={() => router.push('/')} className="back-btn">⬅ Back to Feed</button>
        <Link href="/chat" className="top-chat-button" aria-label="Open chats" title="Chats">
          <FiMessageCircle size={18} />
        </Link>
      </div>

      <div className="card profile-hero profile-page-card">
        <div className="user">
          <Image
            id="profilePic"
            src={data.user.profile_pic || '/default-avatar.svg'}
            alt="Profile"
            width={72}
            height={72}
            unoptimized
          />
          <div className="user-meta">
            <b>{data.user.display_name || data.user.username}</b>
            <span className="handle">@{data.user.username}</span>
            <span className="muted-text">{data.user.is_private ? 'Private account' : 'Public account'}</span>
          </div>
        </div>

        <div className="profile-bio-box">
          <p>{data.user.bio || 'No bio added yet.'}</p>
        </div>

        <div className="stat-strip">
          <button className="stat-pill stat-button" onClick={() => setActiveList('followers')}>
            <strong>{data.followers}</strong> Followers
          </button>
          <button className="stat-pill stat-button" onClick={() => setActiveList('following')}>
            <strong>{data.following}</strong> Following
          </button>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '8px', flexWrap: 'wrap' }}>
          <button onClick={toggleFollow} className="action-btn" disabled={data.isBlocked || data.isBlockedBy}>
            {data.isFollowing ? 'Unfollow' : 'Follow'}
          </button>
          <button
            onClick={() => router.push(`/chat/${data.user.id}`)}
            className="action-btn chat-btn"
            disabled={data.isBlocked || data.isBlockedBy}
          >
            💬 Chat
          </button>
          <button onClick={toggleBlock} className="action-btn">
            {data.isBlocked ? 'Unblock' : 'Block'}
          </button>
        </div>

        {data.isBlocked && <p style={{ marginTop: '10px', color: '#ffb4b4' }}>You blocked this user.</p>}
        {data.isBlockedBy && <p style={{ marginTop: '10px', color: '#ffb4b4' }}>You cannot interact with this user right now.</p>}
        {!data.canViewPosts && !data.isBlocked && !data.isBlockedBy && (
          <p className="muted-text">This profile is private. Follow to view posts.</p>
        )}
      </div>

      <h3>User Posts</h3>
      {data.posts.length === 0 ? (
        <div className="card empty-state"><p>No visible posts yet.</p></div>
      ) : (
        <div className="profile-post-grid">
          {data.posts.map((post) => (
            <div key={post.id} className="post-grid-item">
              {post.media_type === 'video' ? (
                <video src={post.image_url} controls style={{ width: '100%', borderRadius: '12px' }} />
              ) : (
                <Image
                  src={post.image_url}
                  alt="Post"
                  width={600}
                  height={600}
                  unoptimized
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              )}
              {post.caption && <div className="caption">{post.caption}</div>}
            </div>
          ))}
        </div>
      )}

      {activeList && (
        <div className="modal-backdrop" onClick={() => setActiveList(null)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="composer-header">
              <h3>{activeList === 'followers' ? 'Followers' : 'Following'}</h3>
              <button className="navButton" onClick={() => setActiveList(null)}>Close</button>
            </div>
            <div className="profile-list">
              {visibleConnections.length === 0 && <p className="muted-text">No users to show yet.</p>}
              {visibleConnections.map((connection) => (
                <button
                  key={`${activeList}-${connection.id}`}
                  className="result-user-card connection-row"
                  onClick={() => {
                    setActiveList(null);
                    router.push(`/profile/${connection.id}`);
                  }}
                >
                  <div className="user">
                    <Image
                      src={connection.profile_pic || '/default-avatar.svg'}
                      alt="Profile"
                      width={40}
                      height={40}
                      unoptimized
                    />
                    <div className="user-meta">
                      <b>{connection.display_name || connection.username}</b>
                      <span className="handle">@{connection.username}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
