import { Filter } from '../entities/filter.js';
import { UniqueId } from '../value-objects/identifier.js';

export interface FilterRepository {
  save(filter: Filter): Promise<void>;
  findById(id: UniqueId | string): Promise<Filter | null>;
  findByUserId(userId: UniqueId | string): Promise<Filter[]>;
  delete(id: UniqueId | string): Promise<void>;
}
