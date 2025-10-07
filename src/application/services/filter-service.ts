import { Filter } from '../../domain/entities/filter.js';
import { FilterRepository } from '../../domain/repositories/filter-repository.js';
import { UniqueId } from '../../domain/value-objects/identifier.js';
import { NotFoundError, ValidationError } from '../errors/index.js';

export interface UpdateKeywordsInput {
  userId: string;
  keywords: string[];
}

export interface UpdateMinusWordsInput {
  userId: string;
  minusWords: string[];
}

export class FilterService {
  constructor(private readonly filters: FilterRepository) {}

  async setKeywords(input: UpdateKeywordsInput): Promise<Filter> {
    const filter = await this.ensureUserFilter(input.userId);
    filter.updateKeywords(input.keywords);
    await this.filters.save(filter);
    return filter;
  }

  async setMinusWords(input: UpdateMinusWordsInput): Promise<Filter> {
    const filter = await this.ensureUserFilter(input.userId);
    filter.updateMinusWords(input.minusWords);
    await this.filters.save(filter);
    return filter;
  }

  async getUserFilters(userId: string): Promise<Filter[]> {
    return this.filters.findByUserId(userId);
  }

  private async ensureUserFilter(userId: string): Promise<Filter> {
    const normalizedId = userId.trim();

    if (!normalizedId) {
      throw new ValidationError('User identifier is required');
    }

    const existing = await this.filters.findByUserId(normalizedId);

    if (existing.length > 0) {
      return existing[0];
    }

    const filter = Filter.create({
      userId: UniqueId.from(normalizedId),
      keywords: [],
      minusWords: [],
    });

    await this.filters.save(filter);
    return filter;
  }

  async deleteFilter(filterId: string): Promise<void> {
    const filter = await this.filters.findById(filterId);

    if (!filter) {
      throw new NotFoundError(`Filter ${filterId} not found`);
    }

    await this.filters.delete(filterId);
  }
}
