import { ProcessedPost } from '../entities/processed-post.js';
import { UniqueId } from '../value-objects/identifier.js';

export interface ProcessedPostRepository {
  save(processedPost: ProcessedPost): Promise<void>;
  findById(id: UniqueId | string): Promise<ProcessedPost | null>;
  findByHash(hash: string): Promise<ProcessedPost | null>;
  findByUserId(userId: UniqueId | string, limit?: number): Promise<ProcessedPost[]>;
  delete(id: UniqueId | string): Promise<void>;
}
