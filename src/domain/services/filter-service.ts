import { Filter } from '../entities/filter.js';
import { Post } from '../entities/post.js';
import { UniqueId } from '../value-objects/identifier.js';

export interface FilterMatch {
  filterId: UniqueId;
  matchedKeywords: string[];
  matchedMinusWords: string[];
}

export interface FilterEvaluation {
  post: Post;
  matches: FilterMatch[];
  isMatch: boolean;
}

export interface FilterService {
  evaluatePost(post: Post, filters: Iterable<Filter>): FilterEvaluation;
}

export class KeywordFilterService implements FilterService {
  evaluatePost(post: Post, filters: Iterable<Filter>): FilterEvaluation {
    const matches: FilterMatch[] = [];
    const normalizedText = KeywordFilterService.toComparableText(post.text);

    for (const filter of filters) {
      const matchedKeywords = KeywordFilterService.collectMatches(normalizedText, filter.keywords);
      const matchedMinusWords = KeywordFilterService.collectMatches(normalizedText, filter.minusWords);

      if (matchedKeywords.length === 0 && matchedMinusWords.length === 0) {
        continue;
      }

      matches.push({
        filterId: filter.id,
        matchedKeywords,
        matchedMinusWords,
      });
    }

    const isMatch = matches.some((match) => match.matchedKeywords.length > 0 && match.matchedMinusWords.length === 0);

    return { post, matches, isMatch };
  }

  private static toComparableText(text: string): string {
    return text.toLowerCase();
  }

  private static collectMatches(text: string, words: Iterable<string> | readonly string[]): string[] {
    const matches: string[] = [];

    for (const word of words) {
      const comparable = word.toLowerCase();

      if (comparable.length === 0) {
        continue;
      }

      if (text.includes(comparable)) {
        matches.push(word);
      }
    }

    return matches;
  }
}
