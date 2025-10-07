import { Post } from '../../domain/entities/post.js';

export interface PostDTO {
  id: string;
  channelId: string;
  messageId: number;
  text: string;
  mediaType?: string;
  publishedAt: string;
  hash: string;
}

export class PostMapper {
  static toDTO(post: Post): PostDTO {
    const snapshot = post.toJSON();

    return {
      id: snapshot.id.toString(),
      channelId: snapshot.channelId.toString(),
      messageId: snapshot.messageId,
      text: snapshot.text,
      mediaType: snapshot.mediaType?.toString(),
      publishedAt: snapshot.publishedAt.toISOString(),
      hash: snapshot.hash,
    };
  }
}
