CREATE TABLE IF NOT EXISTS channels (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  type TEXT CHECK(type IN ('public', 'private')) NOT NULL,
  is_active INTEGER DEFAULT 1,
  joined_at DATETIME NOT NULL,
  last_message_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS filters (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  keywords TEXT,
  minus_words TEXT,
  is_global INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL,
  message_id INTEGER NOT NULL,
  text TEXT NOT NULL,
  media_type TEXT,
  published_at DATETIME NOT NULL,
  hash TEXT UNIQUE NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (channel_id) REFERENCES channels(id)
);

CREATE TABLE IF NOT EXISTS processed_posts (
  id TEXT PRIMARY KEY,
  original_post_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  matched_keywords TEXT,
  sent_at DATETIME NOT NULL,
  hash TEXT NOT NULL,
  FOREIGN KEY (original_post_id) REFERENCES posts(id)
);

CREATE VIRTUAL TABLE IF NOT EXISTS posts_fts USING fts5 (
  post_id UNINDEXED,
  text,
  content='posts',
  content_rowid='rowid'
);

CREATE TRIGGER IF NOT EXISTS posts_ai AFTER INSERT ON posts BEGIN
  INSERT INTO posts_fts(rowid, post_id, text)
  VALUES (new.rowid, new.id, new.text);
END;

CREATE TRIGGER IF NOT EXISTS posts_ad AFTER DELETE ON posts BEGIN
  INSERT INTO posts_fts(posts_fts, rowid, post_id, text)
  VALUES('delete', old.rowid, old.id, old.text);
END;

CREATE TRIGGER IF NOT EXISTS posts_au AFTER UPDATE ON posts BEGIN
  INSERT INTO posts_fts(posts_fts, rowid, post_id, text)
  VALUES('delete', old.rowid, old.id, old.text);
  INSERT INTO posts_fts(rowid, post_id, text)
  VALUES (new.rowid, new.id, new.text);
END;

CREATE INDEX IF NOT EXISTS idx_channels_username ON channels(username);
CREATE INDEX IF NOT EXISTS idx_channels_active ON channels(is_active);
CREATE INDEX IF NOT EXISTS idx_filters_user_id ON filters(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_channel_id ON posts(channel_id);
CREATE INDEX IF NOT EXISTS idx_posts_hash ON posts(hash);
CREATE INDEX IF NOT EXISTS idx_processed_posts_hash ON processed_posts(hash);
CREATE INDEX IF NOT EXISTS idx_processed_posts_user_id ON processed_posts(user_id);
