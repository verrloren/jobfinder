import { Database as SqliteDatabase } from 'better-sqlite3';
import { Channel } from '../../../domain/entities/channel.js';
import { ChannelRepository } from '../../../domain/repositories/channel-repository.js';
import { ChannelType } from '../../../domain/value-objects/channel-type.js';
import { UniqueId } from '../../../domain/value-objects/identifier.js';

interface ChannelRow {
  id: string;
  username: string;
  title: string;
  type: string;
  is_active: number;
  joined_at: string;
  last_message_id: number | null;
}

export class SqliteChannelRepository implements ChannelRepository {
  constructor(private readonly db: SqliteDatabase) {}

  async save(channel: Channel): Promise<void> {
    const snapshot = channel.toJSON();

    this.db
      .prepare(`
        INSERT INTO channels (id, username, title, type, is_active, joined_at, last_message_id)
        VALUES (@id, @username, @title, @type, @isActive, @joinedAt, @lastMessageId)
        ON CONFLICT(id) DO UPDATE SET
          username = excluded.username,
          title = excluded.title,
          type = excluded.type,
          is_active = excluded.is_active,
          joined_at = excluded.joined_at,
          last_message_id = excluded.last_message_id
      `)
      .run({
        id: snapshot.id.toString(),
        username: snapshot.username,
        title: snapshot.title,
        type: snapshot.type.toString(),
        isActive: snapshot.isActive ? 1 : 0,
        joinedAt: snapshot.joinedAt.toISOString(),
        lastMessageId: snapshot.lastMessageId ?? null,
      });
  }

  async findById(id: UniqueId | string): Promise<Channel | null> {
    const row = this.db
      .prepare('SELECT id, username, title, type, is_active, joined_at, last_message_id FROM channels WHERE id = ?')
      .get(typeof id === 'string' ? id : id.toString()) as ChannelRow | undefined;

    return row ? this.mapRow(row) : null;
  }

  async findByUsername(username: string): Promise<Channel | null> {
    const row = this.db
      .prepare('SELECT id, username, title, type, is_active, joined_at, last_message_id FROM channels WHERE username = ?')
      .get(username) as ChannelRow | undefined;

    return row ? this.mapRow(row) : null;
  }

  async findActive(): Promise<Channel[]> {
    const rows = this.db
      .prepare('SELECT id, username, title, type, is_active, joined_at, last_message_id FROM channels WHERE is_active = 1')
      .all() as ChannelRow[];

    return rows.map((row) => this.mapRow(row));
  }

  async delete(id: UniqueId | string): Promise<void> {
    this.db.prepare('DELETE FROM channels WHERE id = ?').run(typeof id === 'string' ? id : id.toString());
  }

  private mapRow(row: ChannelRow): Channel {
    return Channel.restore({
      id: UniqueId.from(row.id),
      username: row.username,
      title: row.title,
      type: ChannelType.from(row.type),
      isActive: row.is_active === 1,
      joinedAt: new Date(row.joined_at),
      lastMessageId: row.last_message_id === null ? undefined : row.last_message_id,
    });
  }
}
