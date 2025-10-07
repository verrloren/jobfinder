import { Database as SqliteDatabase } from 'better-sqlite3';
import { Filter } from '../../../domain/entities/filter.js';
import { FilterRepository } from '../../../domain/repositories/filter-repository.js';
import { UniqueId } from '../../../domain/value-objects/identifier.js';

interface FilterRow {
  id: string;
  user_id: string;
  keywords: string | null;
  minus_words: string | null;
  is_global: number;
  created_at: string;
}

export class SqliteFilterRepository implements FilterRepository {
  constructor(private readonly db: SqliteDatabase) {}

  async save(filter: Filter): Promise<void> {
    const snapshot = filter.toJSON();

    this.db
      .prepare(`
        INSERT INTO filters (id, user_id, keywords, minus_words, is_global, created_at)
        VALUES (@id, @userId, @keywords, @minusWords, @isGlobal, @createdAt)
        ON CONFLICT(id) DO UPDATE SET
          user_id = excluded.user_id,
          keywords = excluded.keywords,
          minus_words = excluded.minus_words,
          is_global = excluded.is_global
      `)
      .run({
        id: snapshot.id.toString(),
        userId: snapshot.userId.toString(),
        keywords: JSON.stringify(snapshot.keywords),
        minusWords: JSON.stringify(snapshot.minusWords),
        isGlobal: snapshot.isGlobal ? 1 : 0,
        createdAt: snapshot.createdAt.toISOString(),
      });
  }

  async findById(id: UniqueId | string): Promise<Filter | null> {
    const row = this.db
      .prepare('SELECT id, user_id, keywords, minus_words, is_global, created_at FROM filters WHERE id = ?')
      .get(typeof id === 'string' ? id : id.toString()) as FilterRow | undefined;

    return row ? this.mapRow(row) : null;
  }

  async findByUserId(userId: UniqueId | string): Promise<Filter[]> {
    const rows = this.db
      .prepare('SELECT id, user_id, keywords, minus_words, is_global, created_at FROM filters WHERE user_id = ? ORDER BY created_at DESC')
      .all(typeof userId === 'string' ? userId : userId.toString()) as FilterRow[];

    return rows.map((row) => this.mapRow(row));
  }

  async delete(id: UniqueId | string): Promise<void> {
    this.db.prepare('DELETE FROM filters WHERE id = ?').run(typeof id === 'string' ? id : id.toString());
  }

  private mapRow(row: FilterRow): Filter {
    return Filter.restore({
      id: UniqueId.from(row.id),
      userId: UniqueId.from(row.user_id),
      keywords: this.parseWordArray(row.keywords),
      minusWords: this.parseWordArray(row.minus_words),
      isGlobal: row.is_global === 1,
      createdAt: new Date(row.created_at),
    });
  }

  private parseWordArray(value: string | null): string[] {
    if (!value) {
      return [];
    }

    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === 'string');
      }
    } catch {
      // Ignore malformed JSON and fall back to empty list
    }

    return [];
  }
}
