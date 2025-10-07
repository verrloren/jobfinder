import { Filter } from '../../domain/entities/filter.js';

export interface FilterDTO {
  id: string;
  userId: string;
  keywords: string[];
  minusWords: string[];
  isGlobal: boolean;
  createdAt: string;
}

export class FilterMapper {
  static toDTO(filter: Filter): FilterDTO {
    const snapshot = filter.toJSON();

    return {
      id: snapshot.id.toString(),
      userId: snapshot.userId.toString(),
      keywords: [...snapshot.keywords],
      minusWords: [...snapshot.minusWords],
      isGlobal: snapshot.isGlobal,
      createdAt: snapshot.createdAt.toISOString(),
    };
  }
}
