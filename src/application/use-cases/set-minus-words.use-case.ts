import { FilterRepository } from '../../domain/repositories/filter-repository.js';
import { Filter } from '../../domain/entities/filter.js';
import { UniqueId } from '../../domain/value-objects/identifier.js';
import { ValidationError } from '../errors/index.js';

export interface SetMinusWordsCommand {
  userId: string;
  minusWords: string[];
}

export class SetMinusWordsUseCase {
  constructor(private readonly filters: FilterRepository) {}

  async execute(command: SetMinusWordsCommand): Promise<Filter> {
    const userId = command.userId.trim();

    if (!userId) {
      throw new ValidationError('User identifier is required');
    }

    const existing = await this.filters.findByUserId(userId);
    const filter = existing[0] ?? Filter.create({ userId: UniqueId.from(userId) });
    filter.updateMinusWords(command.minusWords);
    await this.filters.save(filter);
    return filter;
  }
}
