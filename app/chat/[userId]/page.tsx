'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FiEdit2, FiSend, FiTrash2, FiUpload } from 'react-icons/fi';

interface Message {
  id: number;
  sender_id: number;
  receiver_id: number;
  content: string | null;
  image_url: string | null;
  media_type: 'image' | 'video' | null;
  edited_at: string | null;
  created_at: string;
}

interface ChatUser {
  id: number;
  username: string;
  display_name: string;
  profile_pic: string | null;
}

export default function Chat() {
  const { userId } = useParams();
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgInput, setMsgInput] = useState('');
  const [chatUser, setChatUser] = useState<ChatUser | null>(null);
  const [uploading, setUploading] = useState(false);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [editInput, setEditInput] = useState('');
  const endRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  const getHeaders = useCallback((includeJson = false): HeadersInit => {
    const headers: HeadersInit = {};
    if (includeJson) {
      headers['Content-Type'] = 'application/json';
    }
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  }, [token]);

  const loadMessages = useCallback(async () => {
    const res = await fetch(`/api/messages/${userId}`, {
      headers: getHeaders(),
    });

    if (!res.ok) {
      return;
    }

    const data = await res.json();
    setMessages(Array.isArray(data.messages) ? data.messages : []);
    setChatUser(data.user || null);
  }, [getHeaders, userId]);

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

  useEffect(() => {
    if (!ready) {
      return;
    }

    void loadMessages();
    const interval = window.setInterval(() => {
      void loadMessages();
    }, 4000);

    return () => window.clearInterval(interval);
  }, [ready, loadMessages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'chat');

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: getHeaders(),
        body: formData,
      });

      const data = (await res.json()) as { success?: boolean; url?: string; error?: string; details?: string };
      if (res.ok && data.success && data.url) {
        setMediaPreview(data.url);
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

  const sendMessage = async () => {
    const content = msgInput.trim();
    const mediaUrl = mediaPreview;

    if (!content && !mediaUrl) return;

    try {
      await fetch(`/api/messages/${userId}`, {
        method: 'POST',
        headers: getHeaders(true),
        body: JSON.stringify({ content: content || null, image_url: mediaUrl, media_type: mediaType }),
      });

      setMsgInput('');
      setMediaPreview(null);
      await loadMessages();
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleEditMessage = async (messageId: number) => {
    if (!editInput.trim()) return;

    try {
      const res = await fetch(`/api/messages/${userId}`, {
        method: 'PUT',
        headers: getHeaders(true),
        body: JSON.stringify({ messageId, content: editInput }),
      });

      if (res.ok) {
        setEditingMessageId(null);
        setEditInput('');
        await loadMessages();
      }
    } catch (error) {
      console.error('Error editing message:', error);
    }
  };

  const handleDeleteMessage = async (messageId: number) => {
    try {
      const res = await fetch(`/api/messages/${userId}`, {
        method: 'DELETE',
        headers: getHeaders(true),
        body: JSON.stringify({ messageId }),
      });

      if (res.ok) {
        await loadMessages();
      }
    } catch (error) {
      console.error('Error deleting message:', error);
    }
  };

  return (
    <div className="container page-with-mobile-nav">
      <div className="card chat-header-card">
        <div className="user">
          <Image
            src={chatUser?.profile_pic || '/default-avatar.svg'}
            alt="Chat profile"
            width={48}
            height={48}
            unoptimized
          />
          <div className="user-meta">
            <b>{chatUser?.display_name || chatUser?.username || `User ${userId}`}</b>
            <span className="handle">Auto-refreshing conversation</span>
          </div>
        </div>
      </div>

      <div className="chatBox">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`message-bubble ${message.sender_id === Number(userId) ? 'received' : 'sent'}`}
          >
            {editingMessageId === message.id ? (
              <div>
                <input
                  type="text"
                  value={editInput}
                  onChange={(e) => setEditInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleEditMessage(message.id)}
                  style={{ width: '100%', marginBottom: '8px' }}
                />
                <button onClick={() => handleEditMessage(message.id)}>Save</button>
                <button onClick={() => setEditingMessageId(null)}>Cancel</button>
              </div>
            ) : (
              <>
                {message.content && <div>{message.content}</div>}
                {message.image_url && (
                  message.media_type === 'video' ? (
                    <video
                      src={message.image_url}
                      controls
                      style={{ maxWidth: '220px', maxHeight: '220px', borderRadius: '8px', marginTop: '8px' }}
                    />
                  ) : (
                    <Image
                      src={message.image_url}
                      alt="Shared media"
                      width={200}
                      height={200}
                      unoptimized
                      style={{ maxWidth: '200px', maxHeight: '200px', borderRadius: '8px', marginTop: '8px', height: 'auto' }}
                    />
                  )
                )}
                {message.sender_id === Number(userId) && (
                  <div className="message-actions">
                    <button onClick={() => { setEditingMessageId(message.id); setEditInput(message.content || ''); }}>
                      <FiEdit2 size={14} />
                    </button>
                    <button onClick={() => handleDeleteMessage(message.id)}>
                      <FiTrash2 size={14} />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {mediaPreview && (
        <div className="image-preview">
          {mediaType === 'video' ? (
            <video src={mediaPreview} controls style={{ maxWidth: '140px', maxHeight: '120px', borderRadius: '8px' }} />
          ) : (
            <Image
              src={mediaPreview}
              alt="Preview"
              width={140}
              height={120}
              unoptimized
              style={{ maxWidth: '140px', maxHeight: '120px', borderRadius: '8px', height: 'auto' }}
            />
          )}
          <button onClick={() => setMediaPreview(null)}>Remove</button>
        </div>
      )}

      <div className="message-input">
        <div className="file-upload">
          <label htmlFor="chat-image-upload" className="upload-btn small">
            <FiUpload size={14} />
          </label>
          <input
            id="chat-image-upload"
            type="file"
            accept="image/*,video/*"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
          />
        </div>
        <input
          value={msgInput}
          onChange={(e) => setMsgInput(e.target.value)}
          placeholder="Type a message..."
          onKeyDown={(e) => e.key === 'Enter' && void sendMessage()}
        />
        <button onClick={() => void sendMessage()} disabled={uploading || (!msgInput.trim() && !mediaPreview)}>
          <FiSend size={16} />
        </button>
      </div>

    </div>
  );
}
