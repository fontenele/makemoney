import { Logger } from '@nestjs/common';
import WebSocket, { RawData } from 'ws';
import { MarketTicker } from '../../domain/market-ticker';
import { TickerStream } from '../../domain/ticker-stream';

interface BinanceMiniTickerEvent {
  e: '24hrMiniTicker';
  E: number;
  s: 'BTCUSDT';
  c: string;
  o: string;
  h: string;
  l: string;
  v: string;
  q: string;
}

type WebSocketFactory = (url: string) => WebSocket;
type Clock = () => Date;

const DECIMAL_PATTERN = /^(0|[1-9]\d*)(\.\d+)?$/;
const INITIAL_RECONNECT_DELAY_MS = 1_000;
const MAX_RECONNECT_DELAY_MS = 30_000;

export class BinancePublicTickerClient implements TickerStream {
  private readonly logger = new Logger(BinancePublicTickerClient.name);
  private socket?: WebSocket;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private reconnectAttempt = 0;
  private onTicker?: (ticker: MarketTicker) => void;
  private stopping = false;

  constructor(
    private readonly baseUrl: string,
    private readonly createWebSocket: WebSocketFactory = (url) =>
      new WebSocket(url),
    private readonly clock: Clock = () => new Date(),
  ) {}

  start(onTicker: (ticker: MarketTicker) => void): void {
    this.onTicker = onTicker;

    if (this.socket || this.reconnectTimer) {
      return;
    }

    this.stopping = false;
    this.connect();
  }

  stop(): void {
    this.stopping = true;
    this.onTicker = undefined;
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

  normalize(message: string): MarketTicker | null {
    let payload: unknown;

    try {
      payload = JSON.parse(message) as unknown;
    } catch {
      return null;
    }

    if (!isBinanceMiniTickerEvent(payload)) {
      return null;
    }

    return {
      provider: 'binance',
      symbol: 'BTC/USDT',
      lastPrice: payload.c,
      eventTime: new Date(payload.E),
      receivedAt: this.clock(),
    };
  }

  private connect(): void {
    if (this.stopping || this.socket) {
      return;
    }

    const socket = this.createWebSocket(this.buildStreamUrl());
    this.socket = socket;

    socket.on('open', () => {
      this.reconnectAttempt = 0;
      this.logger.log(
        'Connected to Binance BTC/USDT public mini ticker stream',
      );
    });
    socket.on('message', (data: RawData) => {
      const ticker = this.normalize(rawDataToString(data));

      if (ticker) {
        this.onTicker?.(ticker);
      }
    });
    socket.on('error', (error: Error) => {
      if (!this.stopping) {
        this.logger.error(
          'Binance public mini ticker stream error',
          error.stack,
        );
      }
    });
    socket.on('close', () => {
      if (this.socket !== socket) {
        return;
      }

      this.socket = undefined;
      this.logger.warn('Binance public mini ticker stream disconnected');
      this.scheduleReconnect();
    });
  }

  private scheduleReconnect(): void {
    if (this.stopping || this.reconnectTimer) {
      return;
    }

    const exponent = Math.min(this.reconnectAttempt, 30);
    const delayMs = Math.min(
      INITIAL_RECONNECT_DELAY_MS * 2 ** exponent,
      MAX_RECONNECT_DELAY_MS,
    );
    this.reconnectAttempt += 1;

    this.logger.warn({
      event: 'market.ticker.reconnect_scheduled',
      attempt: this.reconnectAttempt,
      delayMs,
    });

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      this.connect();
    }, delayMs);
  }

  private buildStreamUrl(): string {
    return `${this.baseUrl.replace(/\/$/, '')}/ws/btcusdt@miniTicker`;
  }
}

function isBinanceMiniTickerEvent(
  value: unknown,
): value is BinanceMiniTickerEvent {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.e === '24hrMiniTicker' &&
    value.s === 'BTCUSDT' &&
    isSafeTimestamp(value.E) &&
    isDecimal(value.c) &&
    isDecimal(value.o) &&
    isDecimal(value.h) &&
    isDecimal(value.l) &&
    isDecimal(value.v) &&
    isDecimal(value.q)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isSafeTimestamp(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isDecimal(value: unknown): value is string {
  return typeof value === 'string' && DECIMAL_PATTERN.test(value);
}

function rawDataToString(data: RawData): string {
  if (Array.isArray(data)) {
    return Buffer.concat(data).toString('utf8');
  }

  if (data instanceof ArrayBuffer) {
    return Buffer.from(data).toString('utf8');
  }

  return data.toString('utf8');
}
