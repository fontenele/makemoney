import { Logger } from '@nestjs/common';
import WebSocket, { RawData } from 'ws';
import { isCanonicalBinanceSymbol } from '../domain/binance-spot-identity';
import {
  SpotSymbolActivity,
  SpotSymbolActivityStream,
  SpotSymbolActivityStreamEvent,
} from '../domain/spot-symbol-activity-stream';

type WebSocketFactory = (url: string) => WebSocket;
type Clock = () => Date;

const INITIAL_RECONNECT_DELAY_MS = 1000;
const MAX_RECONNECT_DELAY_MS = 30_000;

export class BinanceSpotSymbolActivityClient implements SpotSymbolActivityStream {
  private readonly logger = new Logger(BinanceSpotSymbolActivityClient.name);
  private socket?: WebSocket;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private reconnectAttempt = 0;
  private observer?: (event: SpotSymbolActivityStreamEvent) => void;
  private stopping = false;

  constructor(
    private readonly baseUrl: string,
    private readonly createWebSocket: WebSocketFactory = (url) =>
      new WebSocket(url),
    private readonly clock: Clock = () => new Date(),
  ) {}

  start(observer: (event: SpotSymbolActivityStreamEvent) => void): void {
    this.observer = observer;
    if (this.socket || this.reconnectTimer) return;
    this.stopping = false;
    this.connect();
  }

  stop(): void {
    this.stopping = true;
    this.observer = undefined;
    this.reconnectAttempt = 0;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    const socket = this.socket;
    this.socket = undefined;
    if (
      socket &&
      (socket.readyState === WebSocket.OPEN ||
        socket.readyState === WebSocket.CONNECTING)
    ) {
      socket.close();
    }
  }

  normalize(message: string): SpotSymbolActivity[] {
    let payload: unknown;
    try {
      payload = JSON.parse(message) as unknown;
    } catch {
      return [];
    }
    if (!Array.isArray(payload)) return [];
    const receivedAt = this.clock();
    return (payload as unknown[])
      .map((value) => normalizeActivity(value, receivedAt))
      .filter((value): value is SpotSymbolActivity => value !== undefined);
  }

  private connect(): void {
    if (this.stopping || this.socket) return;
    const socket = this.createWebSocket(this.buildStreamUrl());
    this.socket = socket;

    socket.on('open', () => {
      this.reconnectAttempt = 0;
      const observedAt = this.clock();
      this.observer?.({ type: 'connected', observedAt });
      this.logger.log('Connected to Binance all-market mini ticker stream');
    });
    socket.on('message', (data: RawData) => {
      for (const activity of this.normalize(rawDataToString(data))) {
        this.observer?.({ type: 'activity', activity });
      }
    });
    socket.on('error', (error: Error) => {
      if (!this.stopping) {
        this.logger.error(
          'Binance all-market mini ticker stream error',
          error.stack,
        );
      }
    });
    socket.on('close', () => {
      if (this.socket !== socket) return;
      this.socket = undefined;
      this.scheduleReconnect();
    });
  }

  private scheduleReconnect(): void {
    if (this.stopping || this.reconnectTimer) return;
    const exponent = Math.min(this.reconnectAttempt, 30);
    const reconnectDelayMs = Math.min(
      INITIAL_RECONNECT_DELAY_MS * 2 ** exponent,
      MAX_RECONNECT_DELAY_MS,
    );
    this.reconnectAttempt += 1;
    const observedAt = this.clock();
    this.observer?.({
      type: 'disconnected',
      observedAt,
      reconnectAttempt: this.reconnectAttempt,
      reconnectDelayMs,
    });
    this.logger.warn({
      event: 'new_listings.activity_stream.reconnect_scheduled',
      attempt: this.reconnectAttempt,
      delayMs: reconnectDelayMs,
    });
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      this.connect();
    }, reconnectDelayMs);
  }

  private buildStreamUrl(): string {
    return `${this.baseUrl.replace(/\/$/, '')}/ws/!miniTicker@arr`;
  }
}

function normalizeActivity(
  value: unknown,
  receivedAt: Date,
): SpotSymbolActivity | undefined {
  if (
    !isRecord(value) ||
    value.e !== '24hrMiniTicker' ||
    typeof value.s !== 'string' ||
    !value.s.endsWith('USDT') ||
    !isCanonicalBinanceSymbol(value.s) ||
    !isSafeTimestamp(value.E)
  ) {
    return undefined;
  }
  return {
    provider: 'binance',
    symbol: value.s,
    eventTime: new Date(value.E),
    receivedAt,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSafeTimestamp(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function rawDataToString(data: RawData): string {
  if (Array.isArray(data)) return Buffer.concat(data).toString('utf8');
  if (data instanceof ArrayBuffer) return Buffer.from(data).toString('utf8');
  return data.toString('utf8');
}
