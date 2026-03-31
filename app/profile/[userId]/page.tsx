'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface User {
  id: number;
  username: string;
  display_name: string;
  profile_pic: string;
  created_at: string;
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
  isFollowing: boolean;
  isBlocked: boolean;
  isBlockedBy: boolean;
}

export default function Profile() {
  const { userId } = useParams();
  const [data, setData] = useState<ProfileData | null>(null);
  const router = useRouter();

  const loadProfile = useCallback(async () => {
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/profile/${userId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const profileData = await res.json();
    setData(profileData);
  }, [userId]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    (async () => {
      await loadProfile();
    })();
  }, [userId, router, loadProfile]);

  const toggleFollow = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    await fetch(`/api/follow/${userId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    await loadProfile();
  };

  const toggleBlock = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    await fetch(`/api/blocks/${userId}`, {
      method: data?.isBlocked ? 'DELETE' : 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });

    await loadProfile();
  };

  if (!data) return <div>Loading...</div>;

  return (
    <div className="container">
      <button onClick={() => router.push('/')}>⬅ Back to Feed</button>

      <div className="card">
        <div className="user">
          <img id="profilePic" src={data.user.profile_pic || 'https://via.placeholder.com/40'} alt="Profile" />
          <div>
            <b>{data.user.display_name || data.user.username}</b>
            <div style={{ fontSize: '0.9em', color: '#666', marginTop: '4px' }}>
              @{data.user.username}
            </div>
          </div>
        </div>
        <div>
          {data.followers} Followers | {data.following} Following
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
      </div>

      <h3>User Posts</h3>
      <div>
        {data.posts.map((p) => (
          <div key={p.id} className="post">
            {p.media_type === 'video' ? (
              <video src={p.image_url} controls style={{ width: '100%', borderRadius: '12px' }} />
            ) : (
              <img src={p.image_url} alt="Post" />
            )}
            <div className="caption">{p.caption}</div>
          </div>
        ))}
      </div>
    </div>
  );
}