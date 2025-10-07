import { Database as SqliteDatabase } from 'better-sqlite3';
import { Post } from '../../../domain/entities/post.js';
import { PostRepository } from '../../../domain/repositories/post-repository.js';
import { MediaType } from '../../../domain/value-objects/media-type.js';
import { UniqueId } from '../../../domain/value-objects/identifier.js';

interface PostRow {
  id: string;
  channel_id: string;
  message_id: number;
  text: string;
  media_type: string | null;
  published_at: string;
  hash: string;
}

export class SqlitePostRepository implements PostRepository {
  constructor(private readonly db: SqliteDatabase) {}

  async save(post: Post): Promise<void> {
    const snapshot = post.toJSON();

    this.db
      .prepare(`
        INSERT INTO posts (id, channel_id, message_id, text, media_type, published_at, hash)
        VALUES (@id, @channelId, @messageId, @text, @mediaType, @publishedAt, @hash)
        ON CONFLICT(id) DO UPDATE SET
          channel_id = excluded.channel_id,
          message_id = excluded.message_id,
          text = excluded.text,
          media_type = excluded.media_type,
          published_at = excluded.published_at,
          hash = excluded.hash
      `)
      .run({
        id: snapshot.id.toString(),
        channelId: snapshot.channelId.toString(),
        messageId: snapshot.messageId,
        text: snapshot.text,
        mediaType: snapshot.mediaType?.toString() ?? null,
        publishedAt: snapshot.publishedAt.toISOString(),
        hash: snapshot.hash,
      });
  }

  async findById(id: UniqueId | string): Promise<Post | null> {
    const row = this.db
      .prepare('SELECT id, channel_id, message_id, text, media_type, published_at, hash FROM posts WHERE id = ?')
      .get(typeof id === 'string' ? id : id.toString()) as PostRow | undefined;

    return row ? this.mapRow(row) : null;
  }

  async findByHash(hash: string): Promise<Post | null> {
    const row = this.db
      .prepare('SELECT id, channel_id, message_id, text, media_type, published_at, hash FROM posts WHERE hash = ?')
      .get(hash) as PostRow | undefined;

    return row ? this.mapRow(row) : null;
  }

  async search(query: string, limit = 20): Promise<Post[]> {
    const rows = this.db
      .prepare(`
        SELECT p.id, p.channel_id, p.message_id, p.text, p.media_type, p.published_at, p.hash
        FROM posts p
        JOIN posts_fts fts ON fts.rowid = p.rowid
        WHERE fts MATCH ?
        ORDER BY p.published_at DESC
        LIMIT ?
      `)
      .all(query, limit) as PostRow[];

    return rows.map((row) => this.mapRow(row));
  }

  private mapRow(row: PostRow): Post {
    return Post.restore({
      id: UniqueId.from(row.id),
      channelId: UniqueId.from(row.channel_id),
      messageId: row.message_id,
      text: row.text,
      mediaType: row.media_type ? MediaType.from(row.media_type) : undefined,
      publishedAt: new Date(row.published_at),
      hash: row.hash,
    });
  }
}
