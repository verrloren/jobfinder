import { FilterRepository } from '../../domain/repositories/filter-repository.js';
import { Filter } from '../../domain/entities/filter.js';
import { ValidationError } from '../errors/index.js';

export interface GetUserFiltersQuery {
  userId: string;
}

export class GetUserFiltersUseCase {
  constructor(private readonly filters: FilterRepository) {}

  async execute(query: GetUserFiltersQuery): Promise<Filter[]> {
    const userId = query.userId.trim();

    if (!userId) {
      throw new ValidationError('User identifier is required');
    }

    return this.filters.findByUserId(userId);
  }
}
