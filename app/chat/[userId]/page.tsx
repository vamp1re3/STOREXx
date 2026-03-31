'use client';

import Image from 'next/image';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FiUpload, FiSend, FiArrowLeft } from 'react-icons/fi';

interface Message {
  id: number;
  sender_id: number;
  receiver_id: number;
  content: string | null;
  image_url: string | null;
  media_type: 'image' | 'video' | null;
  created_at: string;
}

export default function Chat() {
  const { userId } = useParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgInput, setMsgInput] = useState('');
  const [chatUserName, setChatUserName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const router = useRouter();

  const loadMessages = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const res = await fetch(`/api/messages/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setMessages(Array.isArray(data) ? data : []);
  }, [userId]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    void loadMessages();
    setChatUserName(`User ${userId}`);
  }, [userId, router, loadMessages]);

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
    const token = localStorage.getItem('token');
    if (!token) return;

    const content = msgInput.trim();
    const mediaUrl = mediaPreview;

    if (!content && !mediaUrl) return;

    try {
      await fetch(`/api/messages/${userId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: content || null, image_url: mediaUrl, media_type: mediaType }),
      });

      setMsgInput('');
      setMediaPreview(null);
      await loadMessages();
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  return (
    <div className="container">
      <button onClick={() => router.push('/')} className="back-btn">
        <FiArrowLeft size={16} /> Back to Feed
      </button>

      <h2>Chat with {chatUserName}</h2>

      <div className="chatBox">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`message-bubble ${m.sender_id == parseInt(userId as string) ? 'received' : 'sent'}`}
          >
            {m.content && <div>{m.content}</div>}
            {m.image_url && (
              m.media_type === 'video' ? (
                <video
                  src={m.image_url}
                  controls
                  style={{ maxWidth: '220px', maxHeight: '220px', borderRadius: '8px', marginTop: '8px' }}
                />
              ) : (
                <Image
                  src={m.image_url}
                  alt="Shared media"
                  width={200}
                  height={200}
                  unoptimized
                  style={{ maxWidth: '200px', maxHeight: '200px', borderRadius: '8px', marginTop: '8px', height: 'auto' }}
                />
              )
            )}
          </div>
        ))}
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
          placeholder="Type message..."
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
        />
        <button onClick={sendMessage} disabled={uploading || (!msgInput.trim() && !mediaPreview)}>
          <FiSend size={16} />
        </button>
      </div>
    </div>
  );
}