import { Channel } from '../../domain/entities/channel.js';
import { ChannelRepository } from '../../domain/repositories/channel-repository.js';
import { ChannelType } from '../../domain/value-objects/channel-type.js';
import { UniqueId } from '../../domain/value-objects/identifier.js';
import { ConflictError, NotFoundError, ValidationError } from '../errors/index.js';

export interface FollowChannelInput {
  username: string;
  title: string;
  type: 'public' | 'private';
}

export class ChannelService {
  constructor(private readonly channels: ChannelRepository) {}

  async followChannel(input: FollowChannelInput): Promise<Channel> {
    if (!input.username.trim()) {
      throw new ValidationError('Username is required');
    }

    const normalizedUsername = input.username.trim();
    const existing = await this.channels.findByUsername(normalizedUsername);

    if (existing) {
      if (existing.isActive) {
        throw new ConflictError(`Channel @${normalizedUsername} already followed`);
      }

      existing.activate();
      existing.rename(input.title);
      await this.channels.save(existing);
      return existing;
    }

    const channel = Channel.create({
      username: normalizedUsername,
      title: input.title,
      type: ChannelType.from(input.type),
    });

    await this.channels.save(channel);
    return channel;
  }

  async unfollowChannel(username: string): Promise<void> {
    const normalized = username.trim();

    if (!normalized) {
      throw new ValidationError('Username is required');
    }

    const channel = await this.channels.findByUsername(normalized);

    if (!channel) {
      throw new NotFoundError(`Channel @${normalized} not found`);
    }

    channel.deactivate();
    await this.channels.save(channel);
  }

  async getActiveChannels(): Promise<Channel[]> {
    return this.channels.findActive();
  }

  async updateLastMessageId(channelId: UniqueId, messageId: number): Promise<void> {
    const channel = await this.channels.findById(channelId);

    if (!channel) {
      throw new NotFoundError(`Channel ${channelId.toString()} not found`);
    }

    channel.updateLastMessageId(messageId);
    await this.channels.save(channel);
  }
}
