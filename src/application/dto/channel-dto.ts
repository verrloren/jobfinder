import { Channel } from '../../domain/entities/channel.js';
import { ChannelType } from '../../domain/value-objects/channel-type.js';
import { UniqueId } from '../../domain/value-objects/identifier.js';

export interface ChannelDTO {
  id: string;
  username: string;
  title: string;
  type: string;
  isActive: boolean;
  joinedAt: string;
  lastMessageId?: number;
}

export class ChannelMapper {
  static toDTO(channel: Channel): ChannelDTO {
    const snapshot = channel.toJSON();

    return {
      id: snapshot.id.toString(),
      username: snapshot.username,
      title: snapshot.title,
      type: snapshot.type.toString(),
      isActive: snapshot.isActive,
      joinedAt: snapshot.joinedAt.toISOString(),
      lastMessageId: snapshot.lastMessageId,
    };
  }

  static toEntity(dto: ChannelDTO): Channel {
    return Channel.restore({
      id: UniqueId.from(dto.id),
      username: dto.username,
      title: dto.title,
      type: ChannelType.from(dto.type),
      isActive: dto.isActive,
      joinedAt: new Date(dto.joinedAt),
      lastMessageId: dto.lastMessageId,
    });
  }
}
