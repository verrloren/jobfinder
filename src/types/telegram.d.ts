declare module 'telegram' {
  export class TelegramClient {
    constructor(session: any, apiId: number, apiHash: string, options?: any);
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    destroy(): Promise<void>;
    addEventHandler(handler: (...args: any[]) => any, event?: any): void;
    removeEventHandler(handler: (...args: any[]) => any, event?: any): void;
    invoke<T>(request: any): Promise<T>;
  }

  export namespace Api {
    namespace channels {
      class JoinChannel {
        constructor(params: { channel: string });
      }
      class LeaveChannel {
        constructor(params: { channel: string });
      }
    }
  }
}

declare module 'telegram/events/index.js' {
  export class NewMessage {
    constructor(options?: any);
  }
}

declare module 'telegram/sessions/index.js' {
  export class StringSession {
    constructor(session: string);
  }
}
