import { Logger } from '@nestjs/common';
import WebSocket, { RawData } from 'ws';
import { CandleStream } from '../../domain/candle-stream';
import { MarketCandle } from '../../domain/market-candle';

interface BinanceKlineEvent {
  e: 'kline';
  E: number;
  s: 'BTCUSDT';
  k: {
    t: number;
    T: number;
    s: 'BTCUSDT';
    i: '1m';
    f: number;
    L: number;
    o: string;
    c: string;
    h: string;
    l: string;
    v: string;
    n: number;
    x: boolean;
    q: string;
    V: string;
    Q: string;
    B: string;
  };
}

type WebSocketFactory = (url: string) => WebSocket;
type Clock = () => Date;

const DECIMAL_PATTERN = /^(0|[1-9]\d*)(\.\d+)?$/;
const INITIAL_RECONNECT_DELAY_MS = 1_000;
const MAX_RECONNECT_DELAY_MS = 30_000;

export class BinancePublicCandlesClient implements CandleStream {
  private readonly logger = new Logger(BinancePublicCandlesClient.name);
  private socket?: WebSocket;
  private reconnectTimer?: ReturnType<typeof setTimeout>;
  private reconnectAttempt = 0;
  private onCandle?: (candle: MarketCandle) => void;
  private stopping = false;

  constructor(
    private readonly baseUrl: string,
    private readonly createWebSocket: WebSocketFactory = (url) =>
      new WebSocket(url),
    private readonly clock: Clock = () => new Date(),
  ) {}

  start(onCandle: (candle: MarketCandle) => void): void {
    this.onCandle = onCandle;

    if (this.socket || this.reconnectTimer) {
      return;
    }

    this.stopping = false;
    this.connect();
  }

  stop(): void {
    this.stopping = true;
    this.onCandle = undefined;
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

  normalize(message: string): MarketCandle | null {
    let payload: unknown;

    try {
      payload = JSON.parse(message) as unknown;
    } catch {
      return null;
    }

    if (!isBinanceKlineEvent(payload)) {
      return null;
    }

    return {
      provider: 'binance',
      symbol: 'BTC/USDT',
      interval: '1m',
      openPrice: payload.k.o,
      highPrice: payload.k.h,
      lowPrice: payload.k.l,
      closePrice: payload.k.c,
      openTime: new Date(payload.k.t),
      closeTime: new Date(payload.k.T),
      isClosed: payload.k.x,
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
      this.logger.log('Connected to Binance BTC/USDT public 1m candle stream');
    });
    socket.on('message', (data: RawData) => {
      const candle = this.normalize(rawDataToString(data));

      if (candle) {
        this.onCandle?.(candle);
      }
    });
    socket.on('error', (error: Error) => {
      if (!this.stopping) {
        this.logger.error('Binance public candle stream error', error.stack);
      }
    });
    socket.on('close', () => {
      if (this.socket !== socket) {
        return;
      }

      this.socket = undefined;
      this.logger.warn('Binance public candle stream disconnected');
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
      event: 'market.candle.reconnect_scheduled',
      attempt: this.reconnectAttempt,
      delayMs,
    });

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      this.connect();
    }, delayMs);
  }

  private buildStreamUrl(): string {
    return `${this.baseUrl.replace(/\/$/, '')}/ws/btcusdt@kline_1m`;
  }
}

function isBinanceKlineEvent(value: unknown): value is BinanceKlineEvent {
  if (
    !isRecord(value) ||
    value.e !== 'kline' ||
    value.s !== 'BTCUSDT' ||
    !isSafeTimestamp(value.E) ||
    !isRecord(value.k)
  ) {
    return false;
  }

  const kline = value.k;

  return (
    kline.s === 'BTCUSDT' &&
    kline.i === '1m' &&
    isSafeTimestamp(kline.t) &&
    isSafeTimestamp(kline.T) &&
    kline.T >= kline.t &&
    isNonNegativeSafeInteger(kline.f) &&
    isNonNegativeSafeInteger(kline.L) &&
    isDecimal(kline.o) &&
    isDecimal(kline.c) &&
    isDecimal(kline.h) &&
    isDecimal(kline.l) &&
    isDecimal(kline.v) &&
    isNonNegativeSafeInteger(kline.n) &&
    typeof kline.x === 'boolean' &&
    isDecimal(kline.q) &&
    isDecimal(kline.V) &&
    isDecimal(kline.Q) &&
    isDecimal(kline.B)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isSafeTimestamp(value: unknown): value is number {
  return isNonNegativeSafeInteger(value);
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
