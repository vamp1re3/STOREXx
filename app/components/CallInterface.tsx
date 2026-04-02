'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { FiPhone, FiPhoneOff, FiMic, FiMicOff, FiVideo, FiVideoOff, FiX } from 'react-icons/fi';

interface Call {
  id: number;
  caller_id: number;
  receiver_id: number;
  call_type: 'audio' | 'video';
  status: 'pending' | 'ongoing' | 'ended';
  started_at: string | null;
  ended_at: string | null;
  username: string;
  display_name: string;
  profile_pic: string | null;
}

interface CallInterfaceProps {
  call: Call;
  isIncoming: boolean;
  onAccept: () => void;
  onReject: () => void;
  onEnd: () => void;
  onClose: () => void;
}

export default function CallInterface({
  call,
  isIncoming,
  onAccept,
  onReject,
  onEnd,
  onClose
}: CallInterfaceProps) {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (call.status === 'ongoing') {
      startCallDuration();
      initializeWebRTC();
    }

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      cleanupWebRTC();
    };
  }, [call.status]);

  const startCallDuration = () => {
    if (call.started_at) {
      const startTime = new Date(call.started_at).getTime();
      durationIntervalRef.current = setInterval(() => {
        setCallDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
  };

  const initializeWebRTC = async () => {
    try {
      // Get user media
      const constraints = {
        audio: true,
        video: call.call_type === 'video' ? { width: 1280, height: 720 } : false
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Create peer connection
      const configuration = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      };

      peerConnectionRef.current = new RTCPeerConnection(configuration);

      // Add local stream to peer connection
      stream.getTracks().forEach(track => {
        peerConnectionRef.current!.addTrack(track, stream);
      });

      // Handle remote stream
      peerConnectionRef.current.ontrack = (event) => {
        remoteStreamRef.current = event.streams[0];
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      // Handle ICE candidates
      peerConnectionRef.current.onicecandidate = (event) => {
        if (event.candidate) {
          // In a real implementation, send candidate to signaling server
          console.log('ICE candidate:', event.candidate);
        }
      };

    } catch (error) {
      console.error('Error initializing WebRTC:', error);
    }
  };

  const cleanupWebRTC = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTracks = localStreamRef.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = isMuted;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTracks = localStreamRef.current.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = isVideoOff;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="call-overlay">
      <div className="call-interface">
        <div className="call-header">
          <div className="call-user">
            <Image
              src={call.profile_pic || '/default-avatar.svg'}
              alt={call.display_name}
              width={60}
              height={60}
              unoptimized
            />
            <div className="call-info">
              <h3>{call.display_name}</h3>
              <p>
                {call.status === 'pending' && isIncoming && 'Incoming call...'}
                {call.status === 'pending' && !isIncoming && 'Calling...'}
                {call.status === 'ongoing' && formatDuration(callDuration)}
                {call.status === 'ended' && 'Call ended'}
              </p>
            </div>
          </div>
          <button className="close-call-btn" onClick={onClose}>
            <FiX size={20} />
          </button>
        </div>

        <div className="call-content">
          {call.call_type === 'video' && call.status === 'ongoing' ? (
            <div className="video-container">
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="remote-video"
              />
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="local-video"
              />
            </div>
          ) : (
            <div className="audio-call">
              <div className="call-avatar">
                <Image
                  src={call.profile_pic || '/default-avatar.svg'}
                  alt={call.display_name}
                  width={120}
                  height={120}
                  unoptimized
                />
              </div>
              <div className="call-waves">
                <div className="wave"></div>
                <div className="wave"></div>
                <div className="wave"></div>
                <div className="wave"></div>
              </div>
            </div>
          )}
        </div>

        <div className="call-controls">
          {call.status === 'pending' && isIncoming ? (
            <>
              <button className="call-btn reject" onClick={onReject}>
                <FiPhoneOff size={24} />
                <span>Decline</span>
              </button>
              <button className="call-btn accept" onClick={onAccept}>
                <FiPhone size={24} />
                <span>Accept</span>
              </button>
            </>
          ) : call.status === 'ongoing' ? (
            <>
              <button
                className={`call-btn ${isMuted ? 'active' : ''}`}
                onClick={toggleMute}
              >
                {isMuted ? <FiMicOff size={20} /> : <FiMic size={20} />}
              </button>
              {call.call_type === 'video' && (
                <button
                  className={`call-btn ${isVideoOff ? 'active' : ''}`}
                  onClick={toggleVideo}
                >
                  {isVideoOff ? <FiVideoOff size={20} /> : <FiVideo size={20} />}
                </button>
              )}
              <button className="call-btn end" onClick={onEnd}>
                <FiPhoneOff size={24} />
                <span>End</span>
              </button>
            </>
          ) : (
            <button className="call-btn close" onClick={onClose}>
              <FiX size={20} />
              <span>Close</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}