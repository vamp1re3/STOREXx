'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface Message {
  id: number;
  sender_id: number;
  receiver_id: number;
  content: string;
  created_at: string;
}

export default function Chat() {
  const { userId } = useParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [msgInput, setMsgInput] = useState('');
  const [chatUserName, setChatUserName] = useState('');
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

  const sendMessage = async () => {
    const token = localStorage.getItem('token');
    if (!token || !msgInput.trim()) return;
    await fetch(`/api/messages/${userId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content: msgInput }),
    });
    setMsgInput('');
    loadMessages();
  };

  return (
    <div className="container">
      <button onClick={() => router.push('/')}>⬅ Back to Feed</button>

      <h2>Chat with {chatUserName}</h2>

      <div className="chatBox">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`message-bubble ${m.sender_id == parseInt(userId as string) ? 'received' : 'sent'}`}
          >
            {m.content}
          </div>
        ))}
      </div>

      <input
        value={msgInput}
        onChange={(e) => setMsgInput(e.target.value)}
        placeholder="Type message..."
        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
      />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
}