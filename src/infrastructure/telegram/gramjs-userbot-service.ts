import { EventEmitter } from 'node:events';
import Bottleneck from 'bottleneck';
import { Api, TelegramClient } from 'telegram';
import { NewMessage } from 'telegram/events';
import { StringSession } from 'telegram/sessions';
import type { Logger } from '../logging/logger.js';
import {
  NewMessageHandler,
  TelegramMessagePayload,
  UserbotConfig,
  UserbotService,
} from '../../application/ports/userbot-service.js';

interface FloodWaitError extends Error {
  seconds?: number;
}

const DEFAULT_LIMITS = {
  joinPerMinute: 10,
  leavePerMinute: 10,
  messagesPerMinute: 120,
};

export class GramJsUserbotService implements UserbotService {
  private client: TelegramClient | null = null;
  private readonly emitter = new EventEmitter();
  private readonly joinLimiter: Bottleneck;
  private readonly leaveLimiter: Bottleneck;
  private readonly messageLimiter: Bottleneck;
  private newMessageHandler?: (event: any) => Promise<void>;
  private readonly logger?: Logger;

  constructor(private readonly config: UserbotConfig, dependencies: { logger?: Logger } = {}) {
    const limits = { ...DEFAULT_LIMITS, ...config.rateLimit };
    this.joinLimiter = new Bottleneck({ maxConcurrent: 1, minTime: this.computeMinTime(limits.joinPerMinute) });
    this.leaveLimiter = new Bottleneck({ maxConcurrent: 1, minTime: this.computeMinTime(limits.leavePerMinute) });
    this.messageLimiter = new Bottleneck({ maxConcurrent: 1, minTime: this.computeMinTime(limits.messagesPerMinute) });
    this.logger = dependencies.logger;
  }

  async startMonitoring(): Promise<void> {
    if (this.client) {
      return;
    }

    const session = new StringSession(this.config.session);
    this.client = new TelegramClient(session, this.config.apiId, this.config.apiHash, {
      connectionRetries: 5,
    });

    await this.client.connect();

    this.newMessageHandler = async (event: any) => {
      await this.messageLimiter.schedule(() => this.handleNewMessage(event));
    };

    this.client.addEventHandler(this.newMessageHandler, new NewMessage({ incoming: true }));
    this.logger?.info?.('GramJS userbot monitoring started');
  }

  async stopMonitoring(): Promise<void> {
    if (!this.client) {
      return;
    }

    if (this.newMessageHandler) {
      this.client.removeEventHandler(this.newMessageHandler);
      this.newMessageHandler = undefined;
    }

    await this.client.disconnect();
    await this.client.destroy();
    this.client = null;
    this.logger?.info?.('GramJS userbot monitoring stopped');
  }

  async joinChannel(username: string): Promise<void> {
    const normalized = this.normalizeUsername(username);

    await this.joinLimiter.schedule(async () => {
      const client = await this.ensureClient();

      try {
        await client.invoke(
          new Api.channels.JoinChannel({
            channel: normalized,
          }),
        );
        this.logger?.info?.(`Joined channel ${normalized}`);
      } catch (error) {
        await this.handleTelegramError(error, `join channel ${normalized}`);
      }
    });
  }

  async leaveChannel(username: string): Promise<void> {
    const normalized = this.normalizeUsername(username);

    await this.leaveLimiter.schedule(async () => {
      const client = await this.ensureClient();

      try {
        await client.invoke(
          new Api.channels.LeaveChannel({
            channel: normalized,
          }),
        );
        this.logger?.info?.(`Left channel ${normalized}`);
      } catch (error) {
        await this.handleTelegramError(error, `leave channel ${normalized}`);
      }
    });
  }

  onNewMessage(handler: NewMessageHandler): void {
    this.emitter.on('new-message', handler);
  }

  private async handleNewMessage(event: any): Promise<void> {
    if (!event || !event.message) {
      return;
    }

    const messageEntity = event.message;
    const text: string | undefined = messageEntity.message ?? messageEntity.text;

    if (typeof text !== 'string' || text.trim().length === 0) {
      return;
    }

    const payload: TelegramMessagePayload = {
      channelId: String(messageEntity.peerId?.channelId ?? ''),
      channelUsername: messageEntity.chat?.username ?? undefined,
      messageId: Number(messageEntity.id),
      text,
      raw: messageEntity,
    };

    this.emitter.emit('new-message', payload);
  }

  private async ensureClient(): Promise<TelegramClient> {
    if (!this.client) {
      await this.startMonitoring();
    }

    if (!this.client) {
      throw new Error('Userbot client is not initialized');
    }

    return this.client;
  }

  private normalizeUsername(username: string): string {
    const trimmed = username.trim();

    if (!trimmed) {
      throw new Error('Channel username cannot be empty');
    }

    if (trimmed.startsWith('@') || trimmed.startsWith('t.me/')) {
      return trimmed.replace(/^t\.me\//i, '@');
    }

    return `@${trimmed}`;
  }

  private async handleTelegramError(error: unknown, context: string): Promise<void> {
    const floodWait = this.getFloodWaitSeconds(error);

    if (floodWait) {
      this.logger?.warn?.(`Flood wait while trying to ${context}. Waiting ${floodWait}s`);
      await new Promise((resolve) => setTimeout(resolve, floodWait * 1000));
      return;
    }

    this.logger?.error?.(`Telegram error during ${context}`, error);
    throw error instanceof Error ? error : new Error(`Telegram error during ${context}`);
  }

  private getFloodWaitSeconds(error: unknown): number | null {
    if (!error || typeof error !== 'object') {
      return null;
    }

    const maybeFloodError = error as FloodWaitError;

    if (typeof maybeFloodError.seconds === 'number') {
      return maybeFloodError.seconds;
    }

    return null;
  }

  private computeMinTime(perMinute?: number): number {
    const value = typeof perMinute === 'number' && perMinute > 0 ? perMinute : 1;
    return Math.floor(60_000 / value);
  }
}
