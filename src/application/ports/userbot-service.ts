export interface TelegramMessagePayload {
  channelId: string;
  channelUsername?: string;
  messageId: number;
  text: string;
  raw?: unknown;
}

export interface UserbotConfig {
  apiId: number;
  apiHash: string;
  session: string;
  rateLimit?: {
    joinPerMinute?: number;
    leavePerMinute?: number;
    messagesPerMinute?: number;
  };
}

export type NewMessageHandler = (message: TelegramMessagePayload) => Promise<void> | void;

export interface UserbotService {
  joinChannel(username: string): Promise<void>;
  leaveChannel(username: string): Promise<void>;
  startMonitoring(): Promise<void>;
  stopMonitoring(): Promise<void>;
  onNewMessage(handler: NewMessageHandler): void;
}
