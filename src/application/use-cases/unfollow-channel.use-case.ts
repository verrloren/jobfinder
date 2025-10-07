import { ChannelRepository } from '../../domain/repositories/channel-repository.js';
import { NotFoundError, ValidationError } from '../errors/index.js';

export interface UnfollowChannelCommand {
  username: string;
}

export class UnfollowChannelUseCase {
  constructor(private readonly channels: ChannelRepository) {}

  async execute(command: UnfollowChannelCommand): Promise<void> {
    const username = command.username.trim();

    if (!username) {
      throw new ValidationError('Channel username is required');
    }

    const channel = await this.channels.findByUsername(username);

    if (!channel) {
      throw new NotFoundError(`Channel @${username} not found`);
    }

    channel.deactivate();
    await this.channels.save(channel);
  }
}
