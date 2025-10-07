import { readFileSync } from 'node:fs';

export interface Migration {
  name: string;
  sql: string;
}

const migrations: Migration[] = [
  {
    name: '0001_initial_schema',
    sql: readFileSync(new URL('./0001_initial_schema.sql', import.meta.url), 'utf-8'),
  },
];

export function getMigrations(): Migration[] {
  return migrations;
}
