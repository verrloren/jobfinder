import { MediaType, MediaTypeValue } from '../value-objects/media-type.js';
import { UniqueId } from '../value-objects/identifier.js';

export interface PostProps {
  id: UniqueId;
  channelId: UniqueId;
  messageId: number;
  text: string;
  mediaType?: MediaType;
  publishedAt: Date;
  hash: string;
}

export interface PostCreateProps {
  id?: UniqueId | string;
  channelId: UniqueId | string;
  messageId: number;
  text: string;
  mediaType?: MediaType | MediaTypeValue | string;
  publishedAt?: Date;
  hash: string;
}

export class Post {
  private constructor(private readonly props: PostProps) {}

  static create(raw: PostCreateProps): Post {
    const id = raw.id instanceof UniqueId ? raw.id : UniqueId.create(typeof raw.id === 'string' ? raw.id : undefined);
    const channelId = raw.channelId instanceof UniqueId ? raw.channelId : UniqueId.from(String(raw.channelId));
    const messageId = Post.ensureMessageId(raw.messageId);
    const text = Post.normalizeText(raw.text);
    const mediaType = Post.normalizeMediaType(raw.mediaType);
    const publishedAt = Post.ensureDate(raw.publishedAt);
    const hash = Post.normalizeHash(raw.hash);

    return new Post({ id, channelId, messageId, text, mediaType, publishedAt, hash });
  }

  static restore(props: PostProps): Post {
    Post.ensureMessageId(props.messageId);
    return new Post({
      id: props.id,
      channelId: props.channelId,
      messageId: props.messageId,
      text: Post.normalizeText(props.text),
      mediaType: props.mediaType,
      publishedAt: Post.ensureDate(props.publishedAt),
      hash: Post.normalizeHash(props.hash),
    });
  }

  get id(): UniqueId {
    return this.props.id;
  }

  get channelId(): UniqueId {
    return this.props.channelId;
  }

  get messageId(): number {
    return this.props.messageId;
  }

  get text(): string {
    return this.props.text;
  }

  get mediaType(): MediaType | undefined {
    return this.props.mediaType;
  }

  get publishedAt(): Date {
    return this.props.publishedAt;
  }

  get hash(): string {
    return this.props.hash;
  }

  updateText(text: string): void {
    this.props.text = Post.normalizeText(text);
  }

  setMediaType(mediaType: MediaType | MediaTypeValue | string | undefined): void {
    this.props.mediaType = Post.normalizeMediaType(mediaType);
  }

  toJSON(): PostProps {
    return {
      id: this.props.id,
      channelId: this.props.channelId,
      messageId: this.props.messageId,
      text: this.props.text,
      mediaType: this.props.mediaType,
      publishedAt: new Date(this.props.publishedAt),
      hash: this.props.hash,
    };
  }

  private static ensureMessageId(value: number): number {
    if (!Number.isInteger(value) || value < 0) {
      throw new Error('Post message id must be a non-negative integer');
    }

    return value;
  }

  private static normalizeText(value: string): string {
    if (typeof value !== 'string') {
      throw new Error('Post text must be a string');
    }

    const trimmed = value.trim();

    if (trimmed.length === 0) {
      throw new Error('Post text cannot be empty');
    }

    return trimmed;
  }

  private static normalizeMediaType(value?: MediaType | MediaTypeValue | string): MediaType | undefined {
    if (!value) {
      return undefined;
    }

    if (value instanceof MediaType) {
      return value;
    }

    return MediaType.from(String(value));
  }

  private static ensureDate(value?: Date): Date {
    const date = value ?? new Date();

    if (!(date instanceof Date) || Number.isNaN(date.valueOf())) {
      throw new Error('Invalid post date value');
    }

    return date;
  }

  private static normalizeHash(value: string): string {
    if (typeof value !== 'string') {
      throw new Error('Post hash must be a string');
    }

    const trimmed = value.trim();

    if (trimmed.length === 0) {
      throw new Error('Post hash cannot be empty');
    }

    return trimmed;
  }
}

export type PostSnapshot = PostProps;
