import { Channel } from '../../domain/entities/channel.js';
import { ChannelRepository } from '../../domain/repositories/channel-repository.js';
import { ChannelType } from '../../domain/value-objects/channel-type.js';
import { ConflictError, ValidationError } from '../errors/index.js';

export interface FollowChannelCommand {
  username: string;
  title: string;
  type: 'public' | 'private';
}

export interface FollowChannelResult {
  channel: Channel;
  isNew: boolean;
}

export class FollowChannelUseCase {
  constructor(private readonly channels: ChannelRepository) {}

  async execute(command: FollowChannelCommand): Promise<FollowChannelResult> {
    const username = command.username.trim();

    if (!username) {
      throw new ValidationError('Channel username is required');
    }

    const type = ChannelType.from(command.type);
    const existing = await this.channels.findByUsername(username);

    if (existing && existing.isActive) {
      throw new ConflictError(`Channel @${username} already followed`);
    }

    if (existing && !existing.isActive) {
      existing.activate();
      existing.rename(command.title);
      await this.channels.save(existing);
      return { channel: existing, isNew: false };
    }

    const channel = Channel.create({
      username,
      title: command.title,
      type,
    });

    await this.channels.save(channel);
    return { channel, isNew: true };
  }
}
