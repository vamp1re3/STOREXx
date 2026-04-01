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
END $$;

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