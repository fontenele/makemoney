import { Logger } from '@nestjs/common';
import WebSocket, { RawData } from 'ws';
import { MarketTrade } from '../../domain/market-trade';
import { TradeStream } from '../../domain/trade-stream';

interface BinanceTradeEvent {
  e: 'trade';
  E: number;
  s: 'BTCUSDT';
  t: number;
  p: string;
  q: string;
  T: number;
  m: boolean;
}

type WebSocketFactory = (url: string) => WebSocket;
type Clock = () => Date;

const DECIMAL_PATTERN = /^(0|[1-9]\d*)(\.\d+)?$/;

export class BinancePublicTradesClient implements TradeStream {
  private readonly logger = new Logger(BinancePublicTradesClient.name);
  private socket?: WebSocket;
  private stopping = false;

  constructor(
    private readonly baseUrl: string,
    private readonly createWebSocket: WebSocketFactory = (url) =>
      new WebSocket(url),
    private readonly clock: Clock = () => new Date(),
  ) {}

  start(onTrade: (trade: MarketTrade) => void): void {
    if (this.socket) {
      return;
    }

    this.stopping = false;
    const socket = this.createWebSocket(this.buildStreamUrl());
    this.socket = socket;

    socket.on('open', () => {
      this.logger.log('Connected to Binance BTC/USDT public trade stream');
    });
    socket.on('message', (data: RawData) => {
      const trade = this.normalize(rawDataToString(data));

      if (trade) {
        onTrade(trade);
      }
    });
    socket.on('error', (error: Error) => {
      if (!this.stopping) {
        this.logger.error('Binance public trade stream error', error.stack);
      }
    });
    socket.on('close', () => {
      if (this.socket === socket) {
        this.socket = undefined;
      }
      this.logger.warn('Binance public trade stream disconnected');
    });
  }

  stop(): void {
    this.stopping = true;
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

  normalize(message: string): MarketTrade | null {
    let payload: unknown;

    try {
      payload = JSON.parse(message) as unknown;
    } catch {
      return null;
    }

    if (!isBinanceTradeEvent(payload)) {
      return null;
    }

    return {
      provider: 'binance',
      symbol: 'BTC/USDT',
      tradeId: String(payload.t),
      price: payload.p,
      quantity: payload.q,
      takerSide: payload.m ? 'sell' : 'buy',
      eventTime: new Date(payload.E),
      tradeTime: new Date(payload.T),
      receivedAt: this.clock(),
    };
  }

  private buildStreamUrl(): string {
    return `${this.baseUrl.replace(/\/$/, '')}/ws/btcusdt@trade`;
  }
}

function isBinanceTradeEvent(value: unknown): value is BinanceTradeEvent {
  if (!isRecord(value)) {
    return false;
  }

  return (
    value.e === 'trade' &&
    value.s === 'BTCUSDT' &&
    isSafeTimestamp(value.E) &&
    Number.isSafeInteger(value.t) &&
    typeof value.p === 'string' &&
    DECIMAL_PATTERN.test(value.p) &&
    typeof value.q === 'string' &&
    DECIMAL_PATTERN.test(value.q) &&
    isSafeTimestamp(value.T) &&
    typeof value.m === 'boolean'
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isSafeTimestamp(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
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
