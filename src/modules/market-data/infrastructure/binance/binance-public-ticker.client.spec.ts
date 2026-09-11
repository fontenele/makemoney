import { EventEmitter } from 'node:events';
import { jest } from '@jest/globals';
import WebSocket from 'ws';
import { BinancePublicTickerClient } from './binance-public-ticker.client';

describe('BinancePublicTickerClient', () => {
  const receivedAt = new Date('2026-09-11T12:00:00.000Z');
  const client = new BinancePublicTickerClient(
    'wss://stream.binance.com:9443',
    undefined,
    () => receivedAt,
  );

  afterEach(() => {
    jest.useRealTimers();
  });

  it('normalizes a Binance BTC/USDT mini ticker without numeric conversion', () => {
    const message = JSON.stringify(validTicker());

    expect(client.normalize(message)).toEqual({
      provider: 'binance',
      symbol: 'BTC/USDT',
      lastPrice: '77341.20000000',
      eventTime: new Date(1672515782136),
      receivedAt,
    });
  });

  it.each([
    'not-json',
    JSON.stringify({ e: 'trade' }),
    JSON.stringify({ ...validTicker(), s: 'ETHUSDT' }),
    JSON.stringify({ ...validTicker(), c: 'invalid' }),
    JSON.stringify({ ...validTicker(), v: -1 }),
  ])('ignores an invalid or unexpected payload', (message) => {
    expect(client.normalize(message)).toBeNull();
  });

  it('delivers normalized messages from the public mini ticker stream', () => {
    const socket = createSocket();
    const createWebSocket = jest.fn<(url: string) => WebSocket>(() => socket);
    const onTicker = jest.fn();
    const streamingClient = new BinancePublicTickerClient(
      'wss://stream.binance.com:9443/',
      createWebSocket,
      () => receivedAt,
    );

    streamingClient.start(onTicker);
    socket.emit('message', Buffer.from(JSON.stringify(validTicker())));

    expect(createWebSocket).toHaveBeenCalledWith(
      'wss://stream.binance.com:9443/ws/btcusdt@miniTicker',
    );
    expect(onTicker).toHaveBeenCalledWith(
      expect.objectContaining({ lastPrice: '77341.20000000' }),
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
    const reconnectingClient = new BinancePublicTickerClient(
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
    const reconnectingClient = new BinancePublicTickerClient(
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

function validTicker(): Record<string, unknown> {
  return {
    e: '24hrMiniTicker',
    E: 1672515782136,
    s: 'BTCUSDT',
    c: '77341.20000000',
    o: '76000.00000000',
    h: '78000.00000000',
    l: '75000.00000000',
    v: '1234.50000000',
    q: '95000000.00000000',
  };
}
