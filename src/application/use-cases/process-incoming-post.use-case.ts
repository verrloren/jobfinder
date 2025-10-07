import { ProcessedPost } from '../../domain/entities/processed-post.js';
import { FilterRepository } from '../../domain/repositories/filter-repository.js';
import { PostRepository } from '../../domain/repositories/post-repository.js';
import { ProcessedPostRepository } from '../../domain/repositories/processed-post-repository.js';
import { KeywordFilterService } from '../../domain/services/filter-service.js';
import { DeduplicationService } from '../../domain/services/deduplication-service.js';
import { Filter } from '../../domain/entities/filter.js';
import { Post } from '../../domain/entities/post.js';

export interface ProcessIncomingPostCommand {
  post: Post;
  userId: string;
}

export interface ProcessIncomingPostResult {
  matchedFilters: Filter[];
  processedPost?: ProcessedPost;
  isDuplicate: boolean;
}

export class ProcessIncomingPostUseCase {
  constructor(
    private readonly filters: FilterRepository,
    private readonly posts: PostRepository,
    private readonly processedPosts: ProcessedPostRepository,
    private readonly deduplication: DeduplicationService,
    private readonly keywordFilter: KeywordFilterService,
  ) {}

  async execute(command: ProcessIncomingPostCommand): Promise<ProcessIncomingPostResult> {
    const userFilters = await this.filters.findByUserId(command.userId);

    if (userFilters.length === 0) {
      return { matchedFilters: [], isDuplicate: false };
    }

    await this.posts.save(command.post);

    if (this.deduplication.isDuplicate(command.post)) {
      return { matchedFilters: [], isDuplicate: true };
    }

    const evaluation = this.keywordFilter.evaluatePost(command.post, userFilters);

    if (!evaluation.isMatch) {
      return { matchedFilters: [], isDuplicate: false };
    }

    const processed = ProcessedPost.create({
      originalPostId: command.post.id,
      userId: command.userId,
      matchedKeywords: evaluation.matches.flatMap((match) => match.matchedKeywords),
      hash: command.post.hash,
    });

    await this.processedPosts.save(processed);
    this.deduplication.register(command.post);

    return { matchedFilters: userFilters, processedPost: processed, isDuplicate: false };
  }
}
