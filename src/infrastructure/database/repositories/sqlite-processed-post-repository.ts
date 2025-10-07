import { Database as SqliteDatabase } from 'better-sqlite3';
import { ProcessedPost } from '../../../domain/entities/processed-post.js';
import { ProcessedPostRepository } from '../../../domain/repositories/processed-post-repository.js';
import { UniqueId } from '../../../domain/value-objects/identifier.js';

interface ProcessedPostRow {
  id: string;
  original_post_id: string;
  user_id: string;
  matched_keywords: string | null;
  sent_at: string;
  hash: string;
}

export class SqliteProcessedPostRepository implements ProcessedPostRepository {
  constructor(private readonly db: SqliteDatabase) {}

  async save(processedPost: ProcessedPost): Promise<void> {
    const snapshot = processedPost.toJSON();

    this.db
      .prepare(`
        INSERT INTO processed_posts (id, original_post_id, user_id, matched_keywords, sent_at, hash)
        VALUES (@id, @originalPostId, @userId, @matchedKeywords, @sentAt, @hash)
        ON CONFLICT(id) DO UPDATE SET
          original_post_id = excluded.original_post_id,
          user_id = excluded.user_id,
          matched_keywords = excluded.matched_keywords,
          sent_at = excluded.sent_at,
          hash = excluded.hash
      `)
      .run({
        id: snapshot.id.toString(),
        originalPostId: snapshot.originalPostId.toString(),
        userId: snapshot.userId.toString(),
        matchedKeywords: JSON.stringify(snapshot.matchedKeywords),
        sentAt: snapshot.sentAt.toISOString(),
        hash: snapshot.hash,
      });
  }

  async findById(id: UniqueId | string): Promise<ProcessedPost | null> {
    const row = this.db
      .prepare('SELECT id, original_post_id, user_id, matched_keywords, sent_at, hash FROM processed_posts WHERE id = ?')
      .get(typeof id === 'string' ? id : id.toString()) as ProcessedPostRow | undefined;

    return row ? this.mapRow(row) : null;
  }

  async findByHash(hash: string): Promise<ProcessedPost | null> {
    const row = this.db
      .prepare('SELECT id, original_post_id, user_id, matched_keywords, sent_at, hash FROM processed_posts WHERE hash = ?')
      .get(hash) as ProcessedPostRow | undefined;

    return row ? this.mapRow(row) : null;
  }

  async findByUserId(userId: UniqueId | string, limit = 50): Promise<ProcessedPost[]> {
    const rows = this.db
      .prepare(`
        SELECT id, original_post_id, user_id, matched_keywords, sent_at, hash
        FROM processed_posts
        WHERE user_id = ?
        ORDER BY sent_at DESC
        LIMIT ?
      `)
      .all(typeof userId === 'string' ? userId : userId.toString(), limit) as ProcessedPostRow[];

    return rows.map((row) => this.mapRow(row));
  }

  async delete(id: UniqueId | string): Promise<void> {
    this.db.prepare('DELETE FROM processed_posts WHERE id = ?').run(typeof id === 'string' ? id : id.toString());
  }

  private mapRow(row: ProcessedPostRow): ProcessedPost {
    return ProcessedPost.restore({
      id: UniqueId.from(row.id),
      originalPostId: UniqueId.from(row.original_post_id),
      userId: UniqueId.from(row.user_id),
      matchedKeywords: this.parseKeywords(row.matched_keywords),
      sentAt: new Date(row.sent_at),
      hash: row.hash,
    });
  }

  private parseKeywords(json: string | null): string[] {
    if (!json) {
      return [];
    }

    try {
      const parsed = JSON.parse(json);
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === 'string');
      }
    } catch {
      // Ignore malformed JSON payloads
    }

    return [];
  }
}
