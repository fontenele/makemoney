import { Logger } from '@nestjs/common';
import WebSocket, { RawData } from 'ws';
import { MarketTopOfBook } from '../../domain/market-top-of-book';
import { TopOfBookStream } from '../../domain/top-of-book-stream';

interface BinanceBookTickerEvent {
  u: number;
  s: 'BTCUSDT';
  b: string;
  B: string;
  a: string;
  A: string;
}

type WebSocketFactory = (url: string) => WebSocket;
type Clock = () => Date;

const DECIMAL_PATTERN = /^(0|[1-9]\d*)(\.\d+)?$/;
const INITIAL_RECONNECT_DELAY_MS = 1_000;
const MAX_RECONNECT_DELAY_MS = 30_000;

export class BinancePublicTopOfBookClient implements TopOfBookStream {
  private readonly logger = new Logger(BinancePublicTopOfBookClient.name);
  private socket?: WebSocket;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private reconnectAttempt = 0;
  private onTopOfBook?: (topOfBook: MarketTopOfBook) => void;
  private stopping = false;

  constructor(
    private readonly baseUrl: string,
    private readonly createWebSocket: WebSocketFactory = (url) =>
      new WebSocket(url),
    private readonly clock: Clock = () => new Date(),
  ) {}

  start(onTopOfBook: (topOfBook: MarketTopOfBook) => void): void {
    this.onTopOfBook = onTopOfBook;

    if (this.socket || this.reconnectTimer) {
      return;
    }

    this.stopping = false;
    this.connect();
  }

  stop(): void {
    this.stopping = true;
    this.onTopOfBook = undefined;
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

  normalize(message: string): MarketTopOfBook | null {
    let payload: unknown;

    try {
      payload = JSON.parse(message) as unknown;
    } catch {
      return null;
    }

    if (!isBinanceBookTickerEvent(payload)) {
      return null;
    }

    return {
      provider: 'binance',
      symbol: 'BTC/USDT',
      updateId: String(payload.u),
      bidPrice: payload.b,
      bidQuantity: payload.B,
      askPrice: payload.a,
      askQuantity: payload.A,
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
        'Connected to Binance BTC/USDT public book ticker stream',
      );
    });
    socket.on('message', (data: RawData) => {
      const topOfBook = this.normalize(rawDataToString(data));

      if (topOfBook) {
        this.onTopOfBook?.(topOfBook);
      }
    });
    socket.on('error', (error: Error) => {
      if (!this.stopping) {
        this.logger.error(
          'Binance public book ticker stream error',
          error.stack,
        );
      }
    });
    socket.on('close', () => {
      if (this.socket !== socket) {
        return;
      }

      this.socket = undefined;
      this.logger.warn('Binance public book ticker stream disconnected');
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
      event: 'market.top_of_book.reconnect_scheduled',
      attempt: this.reconnectAttempt,
      delayMs,
    });

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      this.connect();
    }, delayMs);
  }

  private buildStreamUrl(): string {
    return `${this.baseUrl.replace(/\/$/, '')}/ws/btcusdt@bookTicker`;
  }
}

function isBinanceBookTickerEvent(
  value: unknown,
): value is BinanceBookTickerEvent {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isNonNegativeSafeInteger(value.u) &&
    value.s === 'BTCUSDT' &&
    isDecimal(value.b) &&
    isDecimal(value.B) &&
    isDecimal(value.a) &&
    isDecimal(value.A)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNonNegativeSafeInteger(value: unknown): value is number {
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
