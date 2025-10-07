import { DatabaseConnection } from '../../infrastructure/database/index.js';
import {
  SqliteChannelRepository,
  SqliteFilterRepository,
  SqlitePostRepository,
  SqliteProcessedPostRepository,
} from '../../infrastructure/database/repositories/index.js';
import type { Logger } from '../../infrastructure/logging/logger.js';
import { ConsoleLogger } from '../../infrastructure/logging/console-logger.js';
import { InMemoryDeduplicationService, KeywordFilterService } from '../../domain/services/index.js';
import { FollowChannelUseCase } from '../use-cases/follow-channel.use-case.js';
import { UnfollowChannelUseCase } from '../use-cases/unfollow-channel.use-case.js';
import { SetKeywordsUseCase } from '../use-cases/set-keywords.use-case.js';
import { SetMinusWordsUseCase } from '../use-cases/set-minus-words.use-case.js';
import { GetUserFiltersUseCase } from '../use-cases/get-user-filters.use-case.js';
import { ProcessIncomingPostUseCase } from '../use-cases/process-incoming-post.use-case.js';
import { UserbotConfig, UserbotService } from '../ports/userbot-service.js';
import type {
  ChannelRepository,
  FilterRepository,
  PostRepository,
  ProcessedPostRepository,
} from '../../domain/repositories/index.js';

export interface ApplicationRepositories {
  channels: ChannelRepository;
  filters: FilterRepository;
  posts: PostRepository;
  processedPosts: ProcessedPostRepository;
}

export interface ApplicationUseCases {
  followChannel: FollowChannelUseCase;
  unfollowChannel: UnfollowChannelUseCase;
  setKeywords: SetKeywordsUseCase;
  setMinusWords: SetMinusWordsUseCase;
  getUserFilters: GetUserFiltersUseCase;
  processIncomingPost: ProcessIncomingPostUseCase;
}

export interface ApplicationServices {
  deduplication: InMemoryDeduplicationService;
  keywordFilter: KeywordFilterService;
  logger: Logger;
}

export interface ApplicationContext {
  database: DatabaseConnection;
  repositories: ApplicationRepositories;
  useCases: ApplicationUseCases;
  services: ApplicationServices;
  userbot?: UserbotService;
}

let context: ApplicationContext | null = null;

export async function bootstrapApplication(): Promise<ApplicationContext> {
  if (context) {
    return context;
  }

  const logger = new ConsoleLogger();

  const database = new DatabaseConnection({
    filePath: process.env.DATABASE_PATH ?? './data/app.sqlite',
    ensureDir: true,
  });
  database.migrate();

  const channelRepository = new SqliteChannelRepository(database.db);
  const filterRepository = new SqliteFilterRepository(database.db);
  const postRepository = new SqlitePostRepository(database.db);
  const processedPostRepository = new SqliteProcessedPostRepository(database.db);

  const keywordFilterService = new KeywordFilterService();
  const deduplicationService = new InMemoryDeduplicationService();

  const followChannel = new FollowChannelUseCase(channelRepository);
  const unfollowChannel = new UnfollowChannelUseCase(channelRepository);
  const setKeywords = new SetKeywordsUseCase(filterRepository);
  const setMinusWords = new SetMinusWordsUseCase(filterRepository);
  const getUserFilters = new GetUserFiltersUseCase(filterRepository);
  const processIncomingPost = new ProcessIncomingPostUseCase(
    filterRepository,
    postRepository,
    processedPostRepository,
    deduplicationService,
    keywordFilterService,
  );

  const userbotConfig = resolveUserbotConfig();
  const userbot = userbotConfig ? await createUserbot(userbotConfig, logger) : undefined;

  if (userbot) {
    try {
      await userbot.startMonitoring();
    } catch (error) {
      logger.error('Failed to start userbot monitoring', error);
    }
  }

  context = {
    database,
    repositories: {
      channels: channelRepository,
      filters: filterRepository,
      posts: postRepository,
      processedPosts: processedPostRepository,
    },
    useCases: {
      followChannel,
      unfollowChannel,
      setKeywords,
      setMinusWords,
      getUserFilters,
      processIncomingPost,
    },
    services: {
      deduplication: deduplicationService,
      keywordFilter: keywordFilterService,
      logger,
    },
    userbot,
  };
  return context;
}

export function getApplicationContext(): ApplicationContext | null {
  return context;
}

export async function shutdownApplication(): Promise<void> {
  if (!context) {
    return;
  }

  await context.userbot?.stopMonitoring();
  context.database.close();
  context = null;
}

function resolveUserbotConfig(): UserbotConfig | undefined {
  const apiId = process.env.API_ID;
  const apiHash = process.env.API_HASH;
  const session = process.env.USERBOT_SESSION;

  if (!apiId || !apiHash || !session) {
    return undefined;
  }

  const parsedApiId = Number(apiId);

  if (!Number.isInteger(parsedApiId)) {
    throw new Error('API_ID environment variable must be an integer');
  }

  return {
    apiId: parsedApiId,
    apiHash,
    session,
  };
}

async function createUserbot(config: UserbotConfig, logger: Logger): Promise<UserbotService> {
  const { GramJsUserbotService } = await import('../../infrastructure/telegram/gramjs-userbot-service.js');
  return new GramJsUserbotService(config, { logger });
}
