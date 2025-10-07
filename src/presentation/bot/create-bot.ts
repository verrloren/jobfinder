import { Telegraf, Context } from 'telegraf';
import { ApplicationContext } from '../../application/services/bootstrap.js';
import { ApplicationError } from '../../application/errors/application-error.js';
import { FollowChannelUseCase } from '../../application/use-cases/follow-channel.use-case.js';
import { UnfollowChannelUseCase } from '../../application/use-cases/unfollow-channel.use-case.js';
import { SetKeywordsUseCase } from '../../application/use-cases/set-keywords.use-case.js';
import { SetMinusWordsUseCase } from '../../application/use-cases/set-minus-words.use-case.js';
import { GetUserFiltersUseCase } from '../../application/use-cases/get-user-filters.use-case.js';
import type { UserbotService } from '../../application/ports/userbot-service.js';

export interface TelegrafBotConfig {
  token: string;
  application: ApplicationContext;
}

interface CommandDependencies {
  followChannel: FollowChannelUseCase;
  unfollowChannel: UnfollowChannelUseCase;
  setKeywords: SetKeywordsUseCase;
  setMinusWords: SetMinusWordsUseCase;
  getUserFilters: GetUserFiltersUseCase;
  userbot?: UserbotService;
}

export async function createTelegrafBot(config: TelegrafBotConfig): Promise<Telegraf> {
  const bot = new Telegraf(config.token);
  const deps: CommandDependencies = {
    followChannel: config.application.useCases.followChannel,
    unfollowChannel: config.application.useCases.unfollowChannel,
    setKeywords: config.application.useCases.setKeywords,
    setMinusWords: config.application.useCases.setMinusWords,
    getUserFilters: config.application.useCases.getUserFilters,
    userbot: config.application.userbot,
  };

  const logger = config.application.services.logger;

  bot.use(async (ctx, next) => {
    const start = Date.now();
    try {
      await next();
      const duration = Date.now() - start;
      logger.info?.(
        `Handled update ${ctx.update.update_id ?? 'unknown'} (${ctx.updateType}) in ${duration}ms`,
      );
    } catch (error) {
      const duration = Date.now() - start;
      logger.error?.(
        `Error handling update ${ctx.update.update_id ?? 'unknown'} (${ctx.updateType}) after ${duration}ms`,
        error,
      );
      throw error;
    }
  });

  registerCommands(bot, config.application, deps);

  bot.catch((error, ctx) => {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Unhandled bot error', error);
    void ctx.reply(`⚠️ An unexpected error occurred: ${message}`);
  });

  try {
    await bot.telegram.setMyCommands([
      { command: 'start', description: 'Show welcome message' },
      { command: 'help', description: 'List available commands' },
      { command: 'status', description: 'Show current subscriptions and filters' },
      { command: 'ping', description: 'Check bot responsiveness' },
      { command: 'follow', description: 'Subscribe to a channel: /follow <username> [public|private]' },
      { command: 'unfollow', description: 'Unsubscribe from a channel: /unfollow <username>' },
      { command: 'keywords', description: 'Set filter keywords: /keywords word1 word2' },
      { command: 'minus', description: 'Set negative keywords: /minus spam scam' },
    ]);
  } catch (error) {
    console.warn('Unable to register bot commands. Continuing without command list.', error);
  }

  return bot;
}

function registerCommands(bot: Telegraf, application: ApplicationContext, deps: CommandDependencies): void {
  bot.start((ctx) => ctx.reply(buildWelcomeMessage()));
  bot.help((ctx) => ctx.reply(buildHelpMessage()));

  bot.command('ping', (ctx) => ctx.reply('pong')); // simple health check

  bot.command('status', (ctx) =>
    withCommandHandling(ctx, async () => {
      const userId = getUserId(ctx);
      if (!userId) {
        await ctx.reply('Unable to determine your user id.');
        return;
      }

      const [channels, filters] = await Promise.all([
        application.repositories.channels.findActive(),
        deps.getUserFilters.execute({ userId }),
      ]);

      const channelsPart = channels.length
        ? channels.map((channel) => `• ${channel.username} (${channel.type.toString()})`).join('\n')
        : 'No active channels.';

      const keywords = filters[0]?.keywords ?? [];
      const minusWords = filters[0]?.minusWords ?? [];

      const filtersPart = [`Keywords: ${keywords.length ? keywords.join(', ') : '—'}`, `Minus words: ${minusWords.length ? minusWords.join(', ') : '—'}`].join('\n');

      await ctx.reply(`📡 *Subscriptions*
${channelsPart}

🎯 *Filters*
${filtersPart}`, {
        parse_mode: 'Markdown',
      });
    }),
  );

  bot.command('follow', (ctx) =>
    withCommandHandling(ctx, async () => {
      const [usernameArg, typeArg] = extractArgs(ctx);

      if (!usernameArg) {
        await ctx.reply('Usage: /follow <@username|t.me/...> [public|private]');
        return;
      }

      const normalizedType = typeArg === 'private' ? 'private' : 'public';
      const username = normalizeChannel(usernameArg);
      const result = await deps.followChannel.execute({
        username,
        title: username,
        type: normalizedType,
      });

      if (deps.userbot) {
        await deps.userbot.joinChannel(username);
      }

      const response = result.isNew
        ? `✅ Subscribed to ${result.channel.username}`
        : `♻️ Reactivated subscription to ${result.channel.username}`;

      await ctx.reply(response);
    }),
  );

  bot.command('unfollow', (ctx) =>
    withCommandHandling(ctx, async () => {
      const [usernameArg] = extractArgs(ctx);

      if (!usernameArg) {
        await ctx.reply('Usage: /unfollow <@username|t.me/...>');
        return;
      }

      const username = normalizeChannel(usernameArg);
      await deps.unfollowChannel.execute({ username });

      if (deps.userbot) {
        await deps.userbot.leaveChannel(username);
      }

      await ctx.reply(`🛑 Unsubscribed from ${username}`);
    }),
  );

  bot.command('keywords', (ctx) =>
    withCommandHandling(ctx, async () => {
      const userId = getUserId(ctx);
      if (!userId) {
        await ctx.reply('Unable to determine your user id.');
        return;
      }

      const words = extractArgs(ctx);
      if (words.length === 0) {
        await ctx.reply('Usage: /keywords <word1> <word2> ...');
        return;
      }

      const filter = await deps.setKeywords.execute({ userId, keywords: words });
      await ctx.reply(`✅ Keywords updated: ${filter.keywords.join(', ')}`);
    }),
  );

  bot.command('minus', (ctx) =>
    withCommandHandling(ctx, async () => {
      const userId = getUserId(ctx);
      if (!userId) {
        await ctx.reply('Unable to determine your user id.');
        return;
      }

      const words = extractArgs(ctx);
      if (words.length === 0) {
        await ctx.reply('Usage: /minus <word1> <word2> ...');
        return;
      }

      const filter = await deps.setMinusWords.execute({ userId, minusWords: words });
      await ctx.reply(`✅ Minus words updated: ${filter.minusWords.join(', ')}`);
    }),
  );
}

async function withCommandHandling(ctx: Context, handler: () => Promise<void>): Promise<void> {
  try {
    await handler();
  } catch (error) {
    if (error instanceof ApplicationError) {
      await ctx.reply(`⚠️ ${error.message}`);
      return;
    }

    console.error('Unexpected command error', error);
    await ctx.reply('⚠️ Unexpected error while processing your command.');
  }
}

function extractArgs(ctx: Context): string[] {
  const text = ctx.message && 'text' in ctx.message ? ctx.message.text : '';
  return text.split(/\s+/).slice(1).map((value) => value.trim()).filter(Boolean);
}

function getUserId(ctx: Context): string | null {
  if (!ctx.from?.id) {
    return null;
  }
  return String(ctx.from.id);
}

function normalizeChannel(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith('t.me/')) {
    return `@${trimmed.substring(5)}`;
  }
  if (trimmed.startsWith('@')) {
    return trimmed;
  }
  return `@${trimmed}`;
}

function buildWelcomeMessage(): string {
  return [
    '👋 Welcome! I can help you track job channels and filter vacancies.',
    'Use /help to see the list of available commands.',
  ].join('\n');
}

function buildHelpMessage(): string {
  return [
    '📖 *Available commands*',
    '/start - Welcome message',
    '/help - This help message',
    '/status - Show active subscriptions and filters',
    '/ping - Check if the bot is responsive',
    '/follow <channel> [public|private] - Subscribe to a channel',
    '/unfollow <channel> - Unsubscribe from a channel',
    '/keywords <word1> <word2> ... - Set keywords for filtering',
    '/minus <word1> <word2> ... - Set exclusion keywords',
  ].join('\n');
}
