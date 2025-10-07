import Database, { Database as SqliteDatabase, Options as SqliteOptions } from 'better-sqlite3';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { MigrationRunner } from './migration-runner.js';
import { getMigrations } from './migrations/index.js';

export interface DatabaseConfig {
  filePath: string;
  readOnly?: boolean;
  improvePerformance?: boolean;
  ensureDir?: boolean;
}

export class DatabaseConnection {
  private instance: SqliteDatabase | null = null;

  constructor(private readonly config: DatabaseConfig) {}

  get db(): SqliteDatabase {
    if (!this.instance) {
      this.instance = this.open();
    }

    return this.instance;
  }

  migrate(): void {
    const runner = new MigrationRunner(this.db);
    runner.run(getMigrations());
  }

  close(): void {
    if (this.instance) {
      this.instance.close();
      this.instance = null;
    }
  }

  private open(): SqliteDatabase {
    const filePath = resolve(process.cwd(), this.config.filePath);

    if (this.config.ensureDir) {
      const directory = dirname(filePath);
      mkdirSync(directory, { recursive: true });
    }

    const options: SqliteOptions = {
      readonly: this.config.readOnly ?? false,
      fileMustExist: this.config.readOnly ?? false,
    };

    const database = new Database(filePath, options);

    if (this.config.improvePerformance !== false) {
      this.configurePragmas(database);
    }

    return database;
  }

  private configurePragmas(database: SqliteDatabase): void {
    database.pragma('journal_mode = WAL');
    database.pragma('synchronous = NORMAL');
    database.pragma('temp_store = MEMORY');
    database.pragma('foreign_keys = ON');
  }
}
