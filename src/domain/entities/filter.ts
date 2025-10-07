import { UniqueId } from '../value-objects/identifier.js';

export interface FilterProps {
  id: UniqueId;
  userId: UniqueId;
  keywords: string[];
  minusWords: string[];
  isGlobal: boolean;
  createdAt: Date;
}

export interface FilterCreateProps {
  id?: UniqueId | string;
  userId: UniqueId | string;
  keywords?: Iterable<string>;
  minusWords?: Iterable<string>;
  isGlobal?: boolean;
  createdAt?: Date;
}

export class Filter {
  private constructor(private readonly props: FilterProps) {}

  static create(raw: FilterCreateProps): Filter {
    const id = raw.id instanceof UniqueId ? raw.id : UniqueId.create(typeof raw.id === 'string' ? raw.id : undefined);
    const userId = raw.userId instanceof UniqueId ? raw.userId : UniqueId.from(String(raw.userId));
    const keywords = Filter.normalizeWords(raw.keywords);
    const minusWords = Filter.normalizeWords(raw.minusWords);
    const isGlobal = raw.isGlobal ?? false;
    const createdAt = Filter.ensureDate(raw.createdAt);

    return new Filter({ id, userId, keywords, minusWords, isGlobal, createdAt });
  }

  static restore(props: FilterProps): Filter {
    return new Filter({
      id: props.id,
      userId: props.userId,
      keywords: Filter.normalizeWords(props.keywords),
      minusWords: Filter.normalizeWords(props.minusWords),
      isGlobal: props.isGlobal,
      createdAt: Filter.ensureDate(props.createdAt),
    });
  }

  get id(): UniqueId {
    return this.props.id;
  }

  get userId(): UniqueId {
    return this.props.userId;
  }

  get keywords(): readonly string[] {
    return this.props.keywords;
  }

  get minusWords(): readonly string[] {
    return this.props.minusWords;
  }

  get isGlobal(): boolean {
    return this.props.isGlobal;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  updateKeywords(words: Iterable<string>): void {
    this.props.keywords = Filter.normalizeWords(words);
  }

  updateMinusWords(words: Iterable<string>): void {
    this.props.minusWords = Filter.normalizeWords(words);
  }

  setGlobal(value: boolean): void {
    this.props.isGlobal = value;
  }

  toJSON(): FilterProps {
    return {
      id: this.props.id,
      userId: this.props.userId,
      keywords: [...this.props.keywords],
      minusWords: [...this.props.minusWords],
      isGlobal: this.props.isGlobal,
      createdAt: new Date(this.props.createdAt),
    };
  }

  private static normalizeWords(words?: Iterable<string> | readonly string[]): string[] {
    if (!words) {
      return [];
    }

    const unique = new Map<string, string>();

    for (const word of words) {
      if (typeof word !== 'string') {
        throw new Error('Filter keywords must be strings');
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
      throw new Error('Invalid filter date value');
    }

    return date;
  }
}
