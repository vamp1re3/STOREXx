'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { FiX, FiUpload, FiImage, FiVideo } from 'react-icons/fi';

interface CreateStoryProps {
  isOpen: boolean;
  onClose: () => void;
  onStoryCreated: () => void;
}

export default function CreateStory({ isOpen, onClose, onStoryCreated }: CreateStoryProps) {
  const [content, setContent] = useState('');
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'story');

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.success && data.url) {
        setMediaPreview(data.url);
        setMediaType(file.type.startsWith('video/') ? 'video' : 'image');
      } else {
        alert(`Upload failed: ${data.error || 'Please try again.'}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!mediaPreview) return;

    setUploading(true);
    try {
      const res = await fetch('/api/stories', {
        method: 'POST',
        body: JSON.stringify({
          content: content.trim() || null,
          media_url: mediaPreview,
          media_type: mediaType,
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      if (res.ok) {
        onStoryCreated();
        handleClose();
      } else {
        alert('Failed to create story');
      }
    } catch (error) {
      console.error('Error creating story:', error);
      alert('Failed to create story');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setContent('');
    setMediaPreview(null);
    setMediaType('image');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content create-story-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Create Story</h3>
          <button className="close-btn" onClick={handleClose}>
            <FiX size={20} />
          </button>
        </div>

        <div className="modal-body">
          {!mediaPreview ? (
            <div className="upload-area" onClick={() => fileInputRef.current?.click()}>
              <div className="upload-placeholder">
                <FiUpload size={48} />
                <p>Click to upload a photo or video</p>
                <p className="upload-hint">Stories disappear after 24 hours</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </div>
          ) : (
            <div className="story-preview">
              {mediaType === 'video' ? (
                <video
                  src={mediaPreview}
                  controls
                  style={{ width: '100%', maxHeight: '300px', borderRadius: '8px' }}
                />
              ) : (
                <Image
                  src={mediaPreview}
                  alt="Story preview"
                  width={400}
                  height={400}
                  style={{ width: '100%', maxHeight: '300px', objectFit: 'contain', borderRadius: '8px' }}
                  unoptimized
                />
              )}

              <textarea
                placeholder="Add a caption..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                maxLength={100}
                className="story-caption"
              />

              <div className="story-actions">
                <button
                  className="btn-secondary"
                  onClick={() => {
                    setMediaPreview(null);
                    setContent('');
                  }}
                >
                  Change Media
                </button>
                <button
                  className="btn-primary"
                  onClick={handleSubmit}
                  disabled={uploading}
                >
                  {uploading ? 'Creating...' : 'Share Story'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}