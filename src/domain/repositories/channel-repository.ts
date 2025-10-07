import { Channel } from '../entities/channel.js';
import { UniqueId } from '../value-objects/identifier.js';

export interface ChannelRepository {
  save(channel: Channel): Promise<void>;
  findById(id: UniqueId | string): Promise<Channel | null>;
  findByUsername(username: string): Promise<Channel | null>;
  findActive(): Promise<Channel[]>;
  delete(id: UniqueId | string): Promise<void>;
}
