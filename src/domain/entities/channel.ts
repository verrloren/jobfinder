import { ChannelType, ChannelTypeValue } from '../value-objects/channel-type.js';
import { UniqueId } from '../value-objects/identifier.js';

export interface ChannelProps {
  id: UniqueId;
  username: string;
  title: string;
  type: ChannelType;
  isActive: boolean;
  joinedAt: Date;
  lastMessageId?: number;
}

export interface ChannelCreateProps {
  id?: UniqueId | string;
  username: string;
  title: string;
  type: ChannelType | ChannelTypeValue | string;
  isActive?: boolean;
  joinedAt?: Date;
  lastMessageId?: number;
}

export class Channel {
  private constructor(private readonly props: ChannelProps) {}

  static create(raw: ChannelCreateProps): Channel {
    const id = raw.id instanceof UniqueId ? raw.id : UniqueId.create(typeof raw.id === 'string' ? raw.id : undefined);
    const username = Channel.normalizeUsername(raw.username);
    const title = Channel.normalizeTitle(raw.title);
    const type = raw.type instanceof ChannelType ? raw.type : ChannelType.from(String(raw.type));
    const joinedAt = Channel.ensureDate(raw.joinedAt);
    const isActive = raw.isActive ?? true;
    const lastMessageId = Channel.ensureMessageId(raw.lastMessageId);

    return new Channel({ id, username, title, type, isActive, joinedAt, lastMessageId });
  }

  static restore(props: ChannelProps): Channel {
    Channel.ensureMessageId(props.lastMessageId);
    return new Channel({
      ...props,
      username: Channel.normalizeUsername(props.username),
      title: Channel.normalizeTitle(props.title),
      joinedAt: Channel.ensureDate(props.joinedAt),
    });
  }

  get id(): UniqueId {
    return this.props.id;
  }

  get username(): string {
    return this.props.username;
  }

  get title(): string {
    return this.props.title;
  }

  get type(): ChannelType {
    return this.props.type;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get joinedAt(): Date {
    return this.props.joinedAt;
  }

  get lastMessageId(): number | undefined {
    return this.props.lastMessageId;
  }

  activate(): void {
    this.props.isActive = true;
  }

  deactivate(): void {
    this.props.isActive = false;
  }

  rename(newTitle: string): void {
    this.props.title = Channel.normalizeTitle(newTitle);
  }

  updateLastMessageId(messageId: number): void {
    this.props.lastMessageId = Channel.requireMessageId(messageId);
  }

  toJSON(): ChannelProps {
    return {
      id: this.props.id,
      username: this.props.username,
      title: this.props.title,
      type: this.props.type,
      isActive: this.props.isActive,
      joinedAt: new Date(this.props.joinedAt),
      lastMessageId: this.props.lastMessageId,
    };
  }

  private static normalizeUsername(value: string): string {
    if (typeof value !== 'string') {
      throw new Error('Channel username must be a string');
    }

    const trimmed = value.trim();

    if (trimmed.length === 0) {
      throw new Error('Channel username cannot be empty');
    }

    return trimmed;
  }

  private static normalizeTitle(value: string): string {
    if (typeof value !== 'string') {
      throw new Error('Channel title must be a string');
    }

    const trimmed = value.trim();

    if (trimmed.length === 0) {
      throw new Error('Channel title cannot be empty');
    }

    return trimmed;
  }

  private static ensureDate(value?: Date): Date {
    const date = value ?? new Date();

    if (!(date instanceof Date) || Number.isNaN(date.valueOf())) {
      throw new Error('Invalid channel date value');
    }

    return date;
  }

  private static ensureMessageId(value?: number): number | undefined {
    if (typeof value === 'undefined') {
      return undefined;
    }

    return Channel.requireMessageId(value);
  }

  private static requireMessageId(value: number): number {
    if (!Number.isInteger(value) || value < 0) {
      throw new Error('Channel last message id must be a non-negative integer');
    }

    return value;
  }
}

export type ChannelSnapshot = ChannelProps;
export type ChannelUsername = string;
