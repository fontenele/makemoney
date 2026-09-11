import { EventEmitter } from 'node:events';
import { jest } from '@jest/globals';
import WebSocket from 'ws';
import { BinancePublicTopOfBookClient } from './binance-public-top-of-book.client';

describe('BinancePublicTopOfBookClient', () => {
  const receivedAt = new Date('2026-09-11T12:00:00.000Z');
  const client = new BinancePublicTopOfBookClient(
    'wss://stream.binance.com:9443',
    undefined,
    () => receivedAt,
  );

  afterEach(() => {
    jest.useRealTimers();
  });

  it('normalizes BTC/USDT top of book without numeric conversion', () => {
    expect(client.normalize(JSON.stringify(validBookTicker()))).toEqual({
      provider: 'binance',
      symbol: 'BTC/USDT',
      updateId: '400900217',
      bidPrice: '77341.20000000',
      bidQuantity: '0.12500000',
      askPrice: '77341.21000000',
      askQuantity: '0.25000000',
      receivedAt,
    });
  });

  it.each([
    'not-json',
    JSON.stringify({ e: 'trade' }),
    JSON.stringify({ ...validBookTicker(), s: 'ETHUSDT' }),
    JSON.stringify({ ...validBookTicker(), u: -1 }),
    JSON.stringify({ ...validBookTicker(), b: 'invalid' }),
    JSON.stringify({ ...validBookTicker(), A: 1 }),
  ])('ignores an invalid or unexpected payload', (message) => {
    expect(client.normalize(message)).toBeNull();
  });

  it('delivers messages from the public book ticker stream', () => {
    const socket = createSocket();
    const createWebSocket = jest.fn<(url: string) => WebSocket>(() => socket);
    const onTopOfBook = jest.fn();
    const streamingClient = new BinancePublicTopOfBookClient(
      'wss://stream.binance.com:9443/',
      createWebSocket,
      () => receivedAt,
    );

    streamingClient.start(onTopOfBook);
    socket.emit('message', Buffer.from(JSON.stringify(validBookTicker())));

    expect(createWebSocket).toHaveBeenCalledWith(
      'wss://stream.binance.com:9443/ws/btcusdt@bookTicker',
    );
    expect(onTopOfBook).toHaveBeenCalledWith(
      expect.objectContaining({
        bidPrice: '77341.20000000',
        askPrice: '77341.21000000',
      }),
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
    const reconnectingClient = new BinancePublicTopOfBookClient(
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
    const reconnectingClient = new BinancePublicTopOfBookClient(
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

function validBookTicker(): Record<string, unknown> {
  return {
    u: 400900217,
    s: 'BTCUSDT',
    b: '77341.20000000',
    B: '0.12500000',
    a: '77341.21000000',
    A: '0.25000000',
  };
}
