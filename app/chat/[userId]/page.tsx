'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FiUpload, FiSend, FiArrowLeft } from 'react-icons/fi';

interface Message {
  id: number;
  sender_id: number;
  receiver_id: number;
  content: string | null;
  image_url: string | null;
  created_at: string;
}

export default function Chat() {
  const { userId } = useParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgInput, setMsgInput] = useState('');
  const [chatUserName, setChatUserName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }

    loadMessages();
    // For simplicity, set username to userId
    setChatUserName(`User ${userId}`);
  }, [userId, router]);

  const loadMessages = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    const res = await fetch(`/api/messages/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setMessages(data);
  };

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

      const data = await res.json();
      if (data.success) {
        setImagePreview(data.url);
      } else {
        alert('Upload failed: ' + data.error);
      }
    } catch (error) {
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const sendMessage = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const content = msgInput.trim();
    const imageUrl = imagePreview;

    if (!content && !imageUrl) return;

    try {
      await fetch(`/api/messages/${userId}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: content || null, image_url: imageUrl }),
      });

      setMsgInput('');
      setImagePreview(null);
      loadMessages();
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
              <img
                src={m.image_url}
                alt="Shared image"
                style={{ maxWidth: '200px', maxHeight: '200px', borderRadius: '8px', marginTop: '8px' }}
              />
            )}
          </div>
        ))}
      </div>

      {imagePreview && (
        <div className="image-preview">
          <img src={imagePreview} alt="Preview" style={{ maxWidth: '100px', maxHeight: '100px', borderRadius: '8px' }} />
          <button onClick={() => setImagePreview(null)}>Remove</button>
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
            accept="image/*"
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
        <button onClick={sendMessage} disabled={uploading || (!msgInput.trim() && !imagePreview)}>
          <FiSend size={16} />
        </button>
      </div>
    </div>
  );
}