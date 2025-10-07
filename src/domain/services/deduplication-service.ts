import { Post } from '../entities/post.js';

export interface DeduplicationService {
  isDuplicate(post: Post): boolean;
  register(post: Post): void;
}

export interface DeduplicationOptions {
  capacity?: number;
}

export class InMemoryDeduplicationService implements DeduplicationService {
  private readonly seen = new Set<string>();
  private readonly order: string[] = [];
  private readonly capacity: number;

  constructor(options: DeduplicationOptions = {}) {
    this.capacity = options.capacity ?? 5000;

    if (!Number.isInteger(this.capacity) || this.capacity <= 0) {
      throw new Error('Deduplication capacity must be a positive integer');
    }
  }

  isDuplicate(post: Post): boolean {
    const hash = post.hash;
    return this.seen.has(hash);
  }

  register(post: Post): void {
    const hash = post.hash;

    if (this.seen.has(hash)) {
      return;
    }

    this.seen.add(hash);
    this.order.push(hash);
    this.prune();
  }

  clear(): void {
    this.seen.clear();
    this.order.length = 0;
  }

  private prune(): void {
    while (this.order.length > this.capacity) {
      const oldest = this.order.shift();

      if (typeof oldest === 'undefined') {
        break;
      }

      this.seen.delete(oldest);
    }
  }
}
