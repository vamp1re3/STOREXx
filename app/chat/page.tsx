'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiArrowLeft, FiMessageCircle } from 'react-icons/fi';

interface Conversation {
  user_id: number;
  username: string;
  display_name: string;
  profile_pic: string | null;
  content: string | null;
  image_url: string | null;
  media_type: 'image' | 'video' | null;
  last_message_at: string;
  unread_count: number;
}

export default function ChatInbox() {
  const [token, setToken] = useState<string | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const getHeaders = useCallback((): HeadersInit => (token ? { Authorization: `Bearer ${token}` } : {}), [token]);

  const loadConversations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/messages', { headers: getHeaders() });
      if (!res.ok) {
        setConversations([]);
        return;
      }

      const data = await res.json();
      setConversations(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load conversations:', error);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, [getHeaders]);

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
    void loadConversations();
  }, [loadConversations]);

  return (
    <div className="container page-with-mobile-nav">
      <div className="top-bar-row">
        <button onClick={() => router.push('/')} className="back-btn">
          <FiArrowLeft size={16} /> Back to Feed
        </button>
      </div>

      <div className="card search-shell">
        <p className="eyebrow">Messages</p>
        <h1><FiMessageCircle size={24} /> Chats</h1>
        <p className="brand-subtitle">Open recent conversations from the chat icon in the top-right corner.</p>

        {loading && <p>Loading chats...</p>}

        {!loading && conversations.length === 0 && (
          <div className="empty-state">
            <p>No chats yet. Start one from a user profile or the search page.</p>
            <Link href="/search" className="navButton">Find people</Link>
          </div>
        )}

        {!loading && conversations.length > 0 && (
          <div className="profile-list">
            {conversations.map((conversation) => (
              <Link key={conversation.user_id} href={`/chat/${conversation.user_id}`} className="post result-user-card conversation-card">
                <div className="user">
                  <Image
                    src={conversation.profile_pic || '/default-avatar.svg'}
                    alt="Profile"
                    width={44}
                    height={44}
                    unoptimized
                  />
                  <div className="user-meta">
                    <b>{conversation.display_name || conversation.username}</b>
                    <span className="handle">@{conversation.username}</span>
                    <span className="muted-text">
                      {conversation.content || (conversation.media_type === 'video' ? 'Shared a video' : 'Shared a photo')}
                    </span>
                  </div>
                </div>
                <div className="conversation-meta">
                  {conversation.unread_count > 0 ? <span className="badge-dot">{conversation.unread_count}</span> : null}
                </div>
              </Link>
            ))}
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
