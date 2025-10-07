import { Database as SqliteDatabase } from 'better-sqlite3';
import { Migration } from './migrations/index.js';

interface MigrationRecord {
  name: string;
}

export class MigrationRunner {
  constructor(private readonly db: SqliteDatabase) {}

  run(migrations: Iterable<Migration>): void {
    this.ensureMigrationsTable();
    const applied = this.getAppliedMigrations();

    for (const migration of migrations) {
      if (applied.has(migration.name)) {
        continue;
      }

      this.applyMigration(migration);
    }
  }

  private ensureMigrationsTable(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  private getAppliedMigrations(): Set<string> {
    const rows = this.db.prepare('SELECT name FROM migrations').all() as MigrationRecord[];
    return new Set(rows.map((row) => row.name));
  }

  private applyMigration(migration: Migration): void {
    try {
      this.db.exec('BEGIN');
      this.db.exec(migration.sql);
      this.db.prepare('INSERT INTO migrations (name) VALUES (?)').run(migration.name);
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }
}
