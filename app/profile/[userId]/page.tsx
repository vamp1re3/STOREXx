'use client';

import { useState, useEffect } from 'react';
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
}

interface ProfileData {
  user: User;
  posts: Post[];
  followers: number;
  following: number;
  isFollowing: boolean;
}

export default function Profile() {
  const { userId } = useParams();
  const [data, setData] = useState<ProfileData | null>(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    loadProfile();
  }, [userId, router]);

  const loadProfile = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/profile/${userId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const profileData = await res.json();
    setData(profileData);
  };

  const toggleFollow = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    await fetch(`/api/follow/${userId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    loadProfile();
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
        <button onClick={toggleFollow}>
          {data.isFollowing ? 'Unfollow' : 'Follow'}
        </button>
      </div>

      <h3>User Posts</h3>
      <div>
        {data.posts.map((p) => (
          <div key={p.id} className="post">
            <img src={p.image_url} alt="Post" />
            <div className="caption">{p.caption}</div>
          </div>
        ))}
      </div>
    </div>
  );
}