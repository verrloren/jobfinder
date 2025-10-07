import { Post } from '../entities/post.js';
import { UniqueId } from '../value-objects/identifier.js';

export interface PostRepository {
  save(post: Post): Promise<void>;
  findById(id: UniqueId | string): Promise<Post | null>;
  findByHash(hash: string): Promise<Post | null>;
  search(query: string, limit?: number): Promise<Post[]>;
}
