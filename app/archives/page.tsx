'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { FiArchive, FiArrowLeft, FiImage, FiMessageCircle, FiMessageSquare, FiRotateCcw } from 'react-icons/fi';

interface ArchivedItem {
  id: number;
  content?: string;
  image_url?: string;
  media_url?: string;
  media_type?: string;
  caption?: string;
  username?: string;
  display_name?: string;
  profile_pic?: string;
  last_message?: string;
  last_message_time?: string;
  created_at: string;
}

export default function Archives() {
  const [activeTab, setActiveTab] = useState<'posts' | 'stories' | 'chats'>('posts');
  const [archives, setArchives] = useState<ArchivedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchArchives();
  }, [activeTab]);

  const fetchArchives = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/archives?type=${activeTab}`);
      const data = await res.json();
      if (res.ok) {
        setArchives(data.archives);
      }
    } catch (error) {
      console.error('Error fetching archives:', error);
    } finally {
      setLoading(false);
    }
  };

  const unarchiveItem = async (id: number) => {
    try {
      const res = await fetch('/api/archives', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: activeTab, id, action: 'unarchive' }),
      });

      if (res.ok) {
        setArchives(archives.filter(item => item.id !== id));
      }
    } catch (error) {
      console.error('Error unarchiving item:', error);
    }
  };

  const renderPostItem = (post: ArchivedItem) => (
    <div key={post.id} className="archive-item post-item">
      <div className="archive-content">
        {post.image_url && (
          <Image
            src={post.image_url}
            alt="Post"
            width={200}
            height={200}
            unoptimized
            style={{ width: '200px', height: '200px', objectFit: 'cover', borderRadius: '8px' }}
          />
        )}
        <div className="archive-text">
          <p>{post.caption || 'No caption'}</p>
          <small>{new Date(post.created_at).toLocaleDateString()}</small>
        </div>
      </div>
      <button
        className="unarchive-btn"
        onClick={() => unarchiveItem(post.id)}
        title="Unarchive"
      >
        <FiRotateCcw size={16} />
      </button>
    </div>
  );

  const renderStoryItem = (story: ArchivedItem) => (
    <div key={story.id} className="archive-item story-item">
      <div className="archive-content">
        {story.media_url && (
          story.media_type === 'video' ? (
            <video
              src={story.media_url}
              style={{ width: '200px', height: '200px', objectFit: 'cover', borderRadius: '8px' }}
            />
          ) : (
            <Image
              src={story.media_url}
              alt="Story"
              width={200}
              height={200}
              unoptimized
              style={{ width: '200px', height: '200px', objectFit: 'cover', borderRadius: '8px' }}
            />
          )
        )}
        <div className="archive-text">
          <p>{story.content || 'No caption'}</p>
          <small>{new Date(story.created_at).toLocaleDateString()}</small>
        </div>
      </div>
      <button
        className="unarchive-btn"
        onClick={() => unarchiveItem(story.id)}
        title="Unarchive"
      >
        <FiRotateCcw size={16} />
      </button>
    </div>
  );

  const renderChatItem = (chat: ArchivedItem) => (
    <div key={chat.id} className="archive-item chat-item">
      <Link href={`/chat/${chat.id}`} className="archive-content">
        <Image
          src={chat.profile_pic || '/default-avatar.svg'}
          alt={chat.display_name || 'Chat user'}
          width={50}
          height={50}
          unoptimized
        />
        <div className="archive-text">
          <h4>{chat.display_name}</h4>
          <p>{chat.last_message || 'No messages yet'}</p>
          <small>
            {chat.last_message_time
              ? new Date(chat.last_message_time).toLocaleDateString()
              : 'No activity'
            }
          </small>
        </div>
      </Link>
      <button
        className="unarchive-btn"
        onClick={() => unarchiveItem(chat.id)}
        title="Unarchive"
      >
        <FiRotateCcw size={16} />
      </button>
    </div>
  );

  return (
    <div className="container page-with-mobile-nav">
      <div className="archive-header">
        <Link href="/" className="back-btn">
          <FiArrowLeft size={16} /> Back to Feed
        </Link>
        <h1><FiArchive size={24} /> Archives</h1>
      </div>

      <div className="archive-tabs">
        <button
          className={`tab-btn ${activeTab === 'posts' ? 'active' : ''}`}
          onClick={() => setActiveTab('posts')}
        >
          <FiImage size={16} />
          Posts
        </button>
        <button
          className={`tab-btn ${activeTab === 'stories' ? 'active' : ''}`}
          onClick={() => setActiveTab('stories')}
        >
          <FiMessageCircle size={16} />
          Stories
        </button>
        <button
          className={`tab-btn ${activeTab === 'chats' ? 'active' : ''}`}
          onClick={() => setActiveTab('chats')}
        >
          <FiMessageSquare size={16} />
          Chats
        </button>
      </div>

      <div className="archive-content">
        {loading ? (
          <div className="loading-state">
            <p>Loading archives...</p>
          </div>
        ) : archives.length === 0 ? (
          <div className="empty-state">
            <FiArchive size={48} />
            <p>No archived {activeTab} found</p>
          </div>
        ) : (
          <div className="archive-list">
            {archives.map(item => {
              switch (activeTab) {
                case 'posts':
                  return renderPostItem(item);
                case 'stories':
                  return renderStoryItem(item);
                case 'chats':
                  return renderChatItem(item);
                default:
                  return null;
              }
            })}
          </div>
        )}
      </div>
    </div>
  );
}