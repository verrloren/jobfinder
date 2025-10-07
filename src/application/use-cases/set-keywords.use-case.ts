import { FilterRepository } from '../../domain/repositories/filter-repository.js';
import { Filter } from '../../domain/entities/filter.js';
import { UniqueId } from '../../domain/value-objects/identifier.js';
import { ValidationError } from '../errors/index.js';

export interface SetKeywordsCommand {
  userId: string;
  keywords: string[];
}

export class SetKeywordsUseCase {
  constructor(private readonly filters: FilterRepository) {}

  async execute(command: SetKeywordsCommand): Promise<Filter> {
    const userId = command.userId.trim();

    if (!userId) {
      throw new ValidationError('User identifier is required');
    }

    const existing = await this.filters.findByUserId(userId);
    const filter = existing[0] ?? Filter.create({ userId: UniqueId.from(userId) });
    filter.updateKeywords(command.keywords);
    await this.filters.save(filter);
    return filter;
  }
}
