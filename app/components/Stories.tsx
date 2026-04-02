'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { FiPlus, FiX } from 'react-icons/fi';

interface Story {
  id: number;
  user_id: number;
  content: string | null;
  media_url: string;
  media_type: 'image' | 'video';
  created_at: string;
  expires_at: string;
  archived: boolean;
  username: string;
  display_name: string;
  profile_pic: string | null;
  is_own_story: boolean;
}

interface StoriesProps {
  onCreateStory?: () => void;
}

export default function Stories({ onCreateStory }: StoriesProps) {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [storyIndex, setStoryIndex] = useState(0);

  useEffect(() => {
    fetchStories();
  }, []);

  const fetchStories = async () => {
    try {
      const res = await fetch('/api/stories');
      const data = await res.json();
      if (res.ok) {
        setStories(data.stories);
      }
    } catch (error) {
      console.error('Error fetching stories:', error);
    } finally {
      setLoading(false);
    }
  };

  const openStory = (story: Story, index: number) => {
    setSelectedStory(story);
    setStoryIndex(index);
  };

  const closeStory = () => {
    setSelectedStory(null);
    setStoryIndex(0);
  };

  const nextStory = () => {
    if (storyIndex < stories.length - 1) {
      setSelectedStory(stories[storyIndex + 1]);
      setStoryIndex(storyIndex + 1);
    } else {
      closeStory();
    }
  };

  const prevStory = () => {
    if (storyIndex > 0) {
      setSelectedStory(stories[storyIndex - 1]);
      setStoryIndex(storyIndex - 1);
    }
  };

  const deleteStory = async (storyId: number) => {
    try {
      const res = await fetch(`/api/stories/${storyId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setStories(stories.filter(s => s.id !== storyId));
        if (selectedStory?.id === storyId) {
          closeStory();
        }
      }
    } catch (error) {
      console.error('Error deleting story:', error);
    }
  };

  if (loading) {
    return (
      <div className="stories-container">
        <div className="story-ring loading">
          <div className="story-avatar loading"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="stories-container">
        {/* Add Story Button */}
        <div className="story-ring add-story" onClick={onCreateStory}>
          <div className="story-avatar">
            <FiPlus size={20} />
          </div>
          <span className="story-label">Add Story</span>
        </div>

        {/* User Stories */}
        {stories.map((story, index) => (
          <div
            key={story.id}
            className="story-ring"
            onClick={() => openStory(story, index)}
          >
            <div className="story-avatar">
              <Image
                src={story.profile_pic || '/default-avatar.svg'}
                alt={story.display_name}
                width={40}
                height={40}
                unoptimized
              />
            </div>
            <span className="story-label">
              {story.is_own_story ? 'Your story' : story.display_name}
            </span>
          </div>
        ))}
      </div>

      {/* Story Viewer Modal */}
      {selectedStory && (
        <div className="story-modal" onClick={closeStory}>
          <div className="story-viewer" onClick={(e) => e.stopPropagation()}>
            <div className="story-header">
              <div className="story-user">
                <Image
                  src={selectedStory.profile_pic || '/default-avatar.svg'}
                  alt={selectedStory.display_name}
                  width={32}
                  height={32}
                  unoptimized
                />
                <span>{selectedStory.display_name}</span>
                <span className="story-time">
                  {new Date(selectedStory.created_at).toLocaleTimeString()}
                </span>
              </div>
              {selectedStory.is_own_story && (
                <button
                  className="story-delete-btn"
                  onClick={() => deleteStory(selectedStory.id)}
                >
                  <FiX size={20} />
                </button>
              )}
            </div>

            <div className="story-content">
              {selectedStory.media_type === 'video' ? (
                <video
                  src={selectedStory.media_url}
                  controls
                  autoPlay
                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
              ) : (
                <Image
                  src={selectedStory.media_url}
                  alt="Story"
                  fill
                  style={{ objectFit: 'contain' }}
                  unoptimized
                />
              )}
              {selectedStory.content && (
                <div className="story-text">{selectedStory.content}</div>
              )}
            </div>

            {/* Navigation */}
            {storyIndex > 0 && (
              <button className="story-nav prev" onClick={prevStory}>
                ‹
              </button>
            )}
            {storyIndex < stories.length - 1 && (
              <button className="story-nav next" onClick={nextStory}>
                ›
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}