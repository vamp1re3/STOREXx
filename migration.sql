-- Migration script for HELKET app - Safe to run on existing database
-- This script will update your existing schema with new features and optimizations

-- First, check if profile-related columns exist in users table, add them if not
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'users' AND column_name = 'display_name') THEN
        ALTER TABLE users ADD COLUMN display_name VARCHAR(100);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'users' AND column_name = 'bio') THEN
        ALTER TABLE users ADD COLUMN bio TEXT DEFAULT '';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'users' AND column_name = 'is_private') THEN
        ALTER TABLE users ADD COLUMN is_private BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'users' AND column_name = 'email_verified') THEN
        ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'users' AND column_name = 'account_status') THEN
        ALTER TABLE users ADD COLUMN account_status VARCHAR(20) DEFAULT 'active';
    END IF;
END $$;

-- Check if image_url column exists in messages table, add it if not
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'messages' AND column_name = 'image_url') THEN
        ALTER TABLE messages ADD COLUMN image_url VARCHAR(255);
    END IF;
END $$;

-- Add media_type and read tracking columns if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'posts' AND column_name = 'media_type') THEN
        ALTER TABLE posts ADD COLUMN media_type VARCHAR(20) DEFAULT 'image' NOT NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'messages' AND column_name = 'media_type') THEN
        ALTER TABLE messages ADD COLUMN media_type VARCHAR(20) DEFAULT 'image';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'messages' AND column_name = 'read_at') THEN
        ALTER TABLE messages ADD COLUMN read_at TIMESTAMP;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'posts' AND column_name = 'archived') THEN
        ALTER TABLE posts ADD COLUMN archived BOOLEAN DEFAULT FALSE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'messages' AND column_name = 'edited_at') THEN
        ALTER TABLE messages ADD COLUMN edited_at TIMESTAMP;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'messages' AND column_name = 'deleted_at') THEN
        ALTER TABLE messages ADD COLUMN deleted_at TIMESTAMP;
    END IF;
END $$;

-- Create new tables if they don't exist
CREATE TABLE IF NOT EXISTS stories (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  image_url VARCHAR(255) NOT NULL,
  media_type VARCHAR(20) DEFAULT 'image' NOT NULL,
  caption TEXT,
  archived BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL '24 hours'),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS close_friends (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  friend_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, friend_id)
);

CREATE TABLE IF NOT EXISTS conversations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  other_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  muted BOOLEAN DEFAULT FALSE,
  theme VARCHAR(50) DEFAULT 'default',
  background VARCHAR(255),
  archived BOOLEAN DEFAULT FALSE,
  UNIQUE(user_id, other_user_id)
);

CREATE TABLE IF NOT EXISTS calls (
  id SERIAL PRIMARY KEY,
  caller_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  call_type VARCHAR(20) DEFAULT 'audio',
  status VARCHAR(20) DEFAULT 'pending',
  started_at TIMESTAMP,
  ended_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS restrictions (
  id SERIAL PRIMARY KEY,
  restrictor_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  restricted_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(restrictor_id, restricted_id)
);

CREATE TABLE IF NOT EXISTS reports (
  id SERIAL PRIMARY KEY,
  reporter_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  reported_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  reported_message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS feedback (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50),
  content TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for new tables
CREATE INDEX IF NOT EXISTS idx_stories_user_id ON stories(user_id);
CREATE INDEX IF NOT EXISTS idx_stories_expires_at ON stories(expires_at);
CREATE INDEX IF NOT EXISTS idx_stories_created_at ON stories(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_close_friends_user_id ON close_friends(user_id);
CREATE INDEX IF NOT EXISTS idx_close_friends_friend_id ON close_friends(friend_id);

CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_other_user_id ON conversations(other_user_id);

CREATE INDEX IF NOT EXISTS idx_calls_caller_id ON calls(caller_id);
CREATE INDEX IF NOT EXISTS idx_calls_receiver_id ON calls(receiver_id);
CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status);

CREATE INDEX IF NOT EXISTS idx_restrictions_restrictor_id ON restrictions(restrictor_id);
CREATE INDEX IF NOT EXISTS idx_restrictions_restricted_id ON restrictions(restricted_id);

CREATE INDEX IF NOT EXISTS idx_reports_reporter_id ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_reported_user_id ON reports(reported_user_id);

CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id);

-- Create blocks, comments, and bookmarks tables if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'blocks') THEN
        CREATE TABLE blocks (
          id SERIAL PRIMARY KEY,
          blocker_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          blocked_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(blocker_id, blocked_id)
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'comments') THEN
        CREATE TABLE comments (
          id SERIAL PRIMARY KEY,
          post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          content TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bookmarks') THEN
        CREATE TABLE bookmarks (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, post_id)
        );
    END IF;
END $$;

-- Add CASCADE DELETE constraints if they don't exist
-- Note: This might fail if there are existing foreign key constraints, but that's okay

DO $$
BEGIN
    -- Update posts foreign key
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints
               WHERE table_name = 'posts' AND constraint_name LIKE '%user_id%') THEN
        -- Drop existing constraint and recreate with CASCADE
        ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_user_id_fkey;
        ALTER TABLE posts ADD CONSTRAINT posts_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- Ignore errors if constraint doesn't exist or can't be modified
    NULL;
END $$;

DO $$
BEGIN
    -- Update likes foreign keys
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints
               WHERE table_name = 'likes' AND constraint_name LIKE '%user_id%') THEN
        ALTER TABLE likes DROP CONSTRAINT IF EXISTS likes_user_id_fkey;
        ALTER TABLE likes ADD CONSTRAINT likes_user_id_fkey
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.table_constraints
               WHERE table_name = 'likes' AND constraint_name LIKE '%post_id%') THEN
        ALTER TABLE likes DROP CONSTRAINT IF EXISTS likes_post_id_fkey;
        ALTER TABLE likes ADD CONSTRAINT likes_post_id_fkey
            FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

DO $$
BEGIN
    -- Update follows foreign keys
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints
               WHERE table_name = 'follows' AND constraint_name LIKE '%follower_id%') THEN
        ALTER TABLE follows DROP CONSTRAINT IF EXISTS follows_follower_id_fkey;
        ALTER TABLE follows ADD CONSTRAINT follows_follower_id_fkey
            FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.table_constraints
               WHERE table_name = 'follows' AND constraint_name LIKE '%following_id%') THEN
        ALTER TABLE follows DROP CONSTRAINT IF EXISTS follows_following_id_fkey;
        ALTER TABLE follows ADD CONSTRAINT follows_following_id_fkey
            FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

DO $$
BEGIN
    -- Update messages foreign keys
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints
               WHERE table_name = 'messages' AND constraint_name LIKE '%sender_id%') THEN
        ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
        ALTER TABLE messages ADD CONSTRAINT messages_sender_id_fkey
            FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.table_constraints
               WHERE table_name = 'messages' AND constraint_name LIKE '%receiver_id%') THEN
        ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_receiver_id_fkey;
        ALTER TABLE messages ADD CONSTRAINT messages_receiver_id_fkey
            FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE;
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- Create indexes if they don't exist (safe to run multiple times)
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes(post_id);

CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON follows(following_id);

CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_read_at ON messages(receiver_id, read_at);

-- Create composite index for conversations if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(LEAST(sender_id, receiver_id), GREATEST(sender_id, receiver_id), created_at DESC);

-- Indexes for blocks, comments, and bookmarks lookups
CREATE INDEX IF NOT EXISTS idx_blocks_blocker_id ON blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked_id ON blocks(blocked_id);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_post_id ON bookmarks(post_id);

-- Verify the migration completed successfully
SELECT 'Migration completed successfully!' as status;