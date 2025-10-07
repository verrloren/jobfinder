import { randomUUID } from 'node:crypto';

export class UniqueId {
  private constructor(private readonly value: string) {}

  static from(raw: string): UniqueId {
    UniqueId.assert(raw);
    return new UniqueId(raw);
  }

  static create(raw?: string): UniqueId {
    const value = raw ?? randomUUID();
    UniqueId.assert(value);
    return new UniqueId(value);
  }

  equals(other: UniqueId): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }

  valueOf(): string {
    return this.value;
  }

  private static assert(value: string): void {
    if (typeof value !== 'string' || value.trim().length === 0) {
      throw new Error('Identifier must be a non-empty string');
    }
  }
}
