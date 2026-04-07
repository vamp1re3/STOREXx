'use client';

import { useState, useCallback, memo } from 'react';
import { FiPhone, FiVideo } from 'react-icons/fi';
import CallInterface from './CallInterface';

interface CallButtonProps {
  userId: number;
  userName: string;
  userDisplayName: string;
  userProfilePic: string | null;
  callType: 'audio' | 'video';
}

function CallButtonContent({
  userId,
  userName,
  userDisplayName,
  userProfilePic,
  callType
}: CallButtonProps) {
  const [isCalling, setIsCalling] = useState(false);
  const [currentCall, setCurrentCall] = useState<any>(null);
  const [isIncoming, setIsIncoming] = useState(false);

  const initiateCall = useCallback(async () => {
    try {
      const res = await fetch('/api/calls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId: userId, callType }),
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentCall(data.call);
        setIsCalling(true);
        setIsIncoming(false);
      }
    } catch (error) {
      console.error('Error initiating call:', error);
    }
  }, [userId, callType]);

  const handleAccept = useCallback(async () => {
    if (!currentCall) return;

    try {
      const res = await fetch(`/api/calls/${currentCall.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept' }),
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentCall(data.call);
      }
    } catch (error) {
      console.error('Error accepting call:', error);
    }
  }, [currentCall]);

  const handleReject = useCallback(async () => {
    if (!currentCall) return;

    try {
      const res = await fetch(`/api/calls/${currentCall.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject' }),
      });

      if (res.ok) {
        setIsCalling(false);
        setCurrentCall(null);
      }
    } catch (error) {
      console.error('Error rejecting call:', error);
    }
  }, [currentCall]);

  const handleEnd = useCallback(async () => {
    if (!currentCall) return;

    try {
      const res = await fetch(`/api/calls/${currentCall.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'end' }),
      });

      if (res.ok) {
        setIsCalling(false);
        setCurrentCall(null);
      }
    } catch (error) {
      console.error('Error ending call:', error);
    }
  }, [currentCall]);

  const handleClose = useCallback(() => {
    setIsCalling(false);
    setCurrentCall(null);
  }, []);

  return (
    <>
      <button
        className={`call-initiate-btn ${callType}`}
        onClick={initiateCall}
        title={`Start ${callType} call`}
      >
        {callType === 'video' ? <FiVideo size={16} /> : <FiPhone size={16} />}
        <span>{callType === 'video' ? 'Video' : 'Audio'}</span>
      </button>

      {isCalling && currentCall && (
        <CallInterface
          call={{
            ...currentCall,
            username: userName,
            display_name: userDisplayName,
            profile_pic: userProfilePic,
          }}
          isIncoming={isIncoming}
          onAccept={handleAccept}
          onReject={handleReject}
          onEnd={handleEnd}
          onClose={handleClose}
        />
      )}
    </>
  );
}

// Memoize to prevent unnecessary re-renders from parent components
const CallButton = memo(CallButtonContent);
export default CallButton;