import { EventEmitter } from 'node:events';
import { jest } from '@jest/globals';
import WebSocket from 'ws';
import { BinancePublicCandlesClient } from './binance-public-candles.client';

describe('BinancePublicCandlesClient', () => {
  const receivedAt = new Date('2026-09-11T12:00:00.000Z');
  const client = new BinancePublicCandlesClient(
    'wss://stream.binance.com:9443',
    undefined,
    () => receivedAt,
  );

  afterEach(() => {
    jest.useRealTimers();
  });

  it('normalizes a Binance BTC/USDT 1m candle without numeric conversion', () => {
    expect(client.normalize(JSON.stringify(validKline()))).toEqual({
      provider: 'binance',
      symbol: 'BTC/USDT',
      interval: '1m',
      openPrice: '77300.00000000',
      highPrice: '77400.00000000',
      lowPrice: '77250.00000000',
      closePrice: '77341.20000000',
      openTime: new Date(1672515780000),
      closeTime: new Date(1672515839999),
      isClosed: false,
      eventTime: new Date(1672515782136),
      receivedAt,
    });
  });

  it('preserves the provider closed-candle indicator', () => {
    const event = validKline();
    const kline = event.k as Record<string, unknown>;
    kline.x = true;

    expect(client.normalize(JSON.stringify(event))?.isClosed).toBe(true);
  });

  it.each([
    'not-json',
    JSON.stringify({ e: 'trade' }),
    JSON.stringify({ ...validKline(), s: 'ETHUSDT' }),
    JSON.stringify({
      ...validKline(),
      k: { ...(validKline().k as object), i: '5m' },
    }),
    JSON.stringify({
      ...validKline(),
      k: { ...(validKline().k as object), o: 'invalid' },
    }),
    JSON.stringify({
      ...validKline(),
      k: { ...(validKline().k as object), n: -1 },
    }),
  ])('ignores an invalid or unexpected payload', (message) => {
    expect(client.normalize(message)).toBeNull();
  });

  it('delivers messages from the public 1m candle stream', () => {
    const socket = createSocket();
    const createWebSocket = jest.fn<(url: string) => WebSocket>(() => socket);
    const onCandle = jest.fn();
    const streamingClient = new BinancePublicCandlesClient(
      'wss://stream.binance.com:9443/',
      createWebSocket,
      () => receivedAt,
    );

    streamingClient.start(onCandle);
    socket.emit('message', Buffer.from(JSON.stringify(validKline())));

    expect(createWebSocket).toHaveBeenCalledWith(
      'wss://stream.binance.com:9443/ws/btcusdt@kline_1m',
    );
    expect(onCandle).toHaveBeenCalledWith(
      expect.objectContaining({ interval: '1m', closePrice: '77341.20000000' }),
    );
    streamingClient.stop();
  });

  it('reconnects with bounded exponential backoff and resets after open', () => {
    jest.useFakeTimers();
    const sockets = [
      createSocket(),
      createSocket(),
      createSocket(),
      createSocket(),
    ];
    const createWebSocket = jest
      .fn<(url: string) => WebSocket>()
      .mockReturnValueOnce(sockets[0])
      .mockReturnValueOnce(sockets[1])
      .mockReturnValueOnce(sockets[2])
      .mockReturnValueOnce(sockets[3]);
    const reconnectingClient = new BinancePublicCandlesClient(
      'wss://stream.binance.com:9443',
      createWebSocket,
    );

    reconnectingClient.start(jest.fn());
    sockets[0].emit('close');
    jest.advanceTimersByTime(1_000);
    sockets[1].emit('close');
    jest.advanceTimersByTime(2_000);
    sockets[2].emit('open');
    sockets[2].emit('close');
    jest.advanceTimersByTime(1_000);

    expect(createWebSocket).toHaveBeenCalledTimes(4);
    reconnectingClient.stop();
  });

  it('cancels a pending reconnection on shutdown', () => {
    jest.useFakeTimers();
    const socket = createSocket();
    const createWebSocket = jest.fn<(url: string) => WebSocket>(() => socket);
    const reconnectingClient = new BinancePublicCandlesClient(
      'wss://stream.binance.com:9443',
      createWebSocket,
    );

    reconnectingClient.start(jest.fn());
    socket.emit('close');
    reconnectingClient.stop();
    jest.runAllTimers();

    expect(createWebSocket).toHaveBeenCalledTimes(1);
  });
});

type TestWebSocket = WebSocket & { closeMock: jest.Mock<() => void> };

function createSocket(): TestWebSocket {
  const socket = new EventEmitter() as unknown as TestWebSocket;
  const closeMock = jest.fn<() => void>();
  Object.defineProperty(socket, 'readyState', {
    configurable: true,
    value: WebSocket.OPEN,
  });
  socket.close = closeMock;
  socket.closeMock = closeMock;

  return socket;
}

function validKline(): Record<string, unknown> {
  return {
    e: 'kline',
    E: 1672515782136,
    s: 'BTCUSDT',
    k: {
      t: 1672515780000,
      T: 1672515839999,
      s: 'BTCUSDT',
      i: '1m',
      f: 100,
      L: 200,
      o: '77300.00000000',
      c: '77341.20000000',
      h: '77400.00000000',
      l: '77250.00000000',
      v: '12.50000000',
      n: 100,
      x: false,
      q: '966750.00000000',
      V: '6.25000000',
      Q: '483375.00000000',
      B: '0',
    },
  };
}
