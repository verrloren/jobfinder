import { UniqueId } from '../value-objects/identifier.js';

export interface ProcessedPostProps {
  id: UniqueId;
  originalPostId: UniqueId;
  userId: UniqueId;
  matchedKeywords: string[];
  sentAt: Date;
  hash: string;
}

export interface ProcessedPostCreateProps {
  id?: UniqueId | string;
  originalPostId: UniqueId | string;
  userId: UniqueId | string;
  matchedKeywords?: Iterable<string>;
  sentAt?: Date;
  hash: string;
}

export class ProcessedPost {
  private constructor(private readonly props: ProcessedPostProps) {}

  static create(raw: ProcessedPostCreateProps): ProcessedPost {
    const id = raw.id instanceof UniqueId ? raw.id : UniqueId.create(typeof raw.id === 'string' ? raw.id : undefined);
    const originalPostId = raw.originalPostId instanceof UniqueId ? raw.originalPostId : UniqueId.from(String(raw.originalPostId));
    const userId = raw.userId instanceof UniqueId ? raw.userId : UniqueId.from(String(raw.userId));
    const matchedKeywords = ProcessedPost.normalizeKeywords(raw.matchedKeywords);
    const sentAt = ProcessedPost.ensureDate(raw.sentAt);
    const hash = ProcessedPost.normalizeHash(raw.hash);

    return new ProcessedPost({ id, originalPostId, userId, matchedKeywords, sentAt, hash });
  }

  static restore(props: ProcessedPostProps): ProcessedPost {
    return new ProcessedPost({
      id: props.id,
      originalPostId: props.originalPostId,
      userId: props.userId,
      matchedKeywords: ProcessedPost.normalizeKeywords(props.matchedKeywords),
      sentAt: ProcessedPost.ensureDate(props.sentAt),
      hash: ProcessedPost.normalizeHash(props.hash),
    });
  }

  get id(): UniqueId {
    return this.props.id;
  }

  get originalPostId(): UniqueId {
    return this.props.originalPostId;
  }

  get userId(): UniqueId {
    return this.props.userId;
  }

  get matchedKeywords(): readonly string[] {
    return this.props.matchedKeywords;
  }

  get sentAt(): Date {
    return this.props.sentAt;
  }

  get hash(): string {
    return this.props.hash;
  }

  updateMatchedKeywords(words: Iterable<string>): void {
    this.props.matchedKeywords = ProcessedPost.normalizeKeywords(words);
  }

  toJSON(): ProcessedPostProps {
    return {
      id: this.props.id,
      originalPostId: this.props.originalPostId,
      userId: this.props.userId,
      matchedKeywords: [...this.props.matchedKeywords],
      sentAt: new Date(this.props.sentAt),
      hash: this.props.hash,
    };
  }

  private static normalizeKeywords(words?: Iterable<string> | readonly string[]): string[] {
    if (!words) {
      return [];
    }

    const unique = new Map<string, string>();

    for (const word of words) {
      if (typeof word !== 'string') {
        throw new Error('Processed post keywords must be strings');
      }

      const trimmed = word.trim();

      if (trimmed.length === 0) {
        continue;
      }

      const key = trimmed.toLowerCase();

      if (!unique.has(key)) {
        unique.set(key, trimmed);
      }
    }

    return [...unique.values()];
  }

  private static ensureDate(value?: Date): Date {
    const date = value ?? new Date();

    if (!(date instanceof Date) || Number.isNaN(date.valueOf())) {
      throw new Error('Invalid processed post date value');
    }

    return date;
  }

  private static normalizeHash(value: string): string {
    if (typeof value !== 'string') {
      throw new Error('Processed post hash must be a string');
    }

    const trimmed = value.trim();

    if (trimmed.length === 0) {
      throw new Error('Processed post hash cannot be empty');
    }

    return trimmed;
  }
}

export type ProcessedPostSnapshot = ProcessedPostProps;
