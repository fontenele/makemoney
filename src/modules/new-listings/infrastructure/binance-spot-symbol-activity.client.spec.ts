import { EventEmitter } from 'node:events';
import { jest } from '@jest/globals';
import WebSocket from 'ws';
import { SpotSymbolActivityStreamEvent } from '../domain/spot-symbol-activity-stream';
import { BinanceSpotSymbolActivityClient } from './binance-spot-symbol-activity.client';

describe('BinanceSpotSymbolActivityClient', () => {
  const receivedAt = new Date('2026-10-28T12:00:00.000Z');

  it('normalizes only canonical USDT mini-ticker activity', () => {
    const client = new BinanceSpotSymbolActivityClient(
      'wss://example.com',
      undefined,
      () => receivedAt,
    );

    expect(
      client.normalize(
        JSON.stringify([
          ticker('NEWUSDT'),
          ticker('ETHBTC'),
          ticker('币安人生USDT'),
          { ...ticker('BADUSDT'), e: 'trade' },
          { ...ticker('LATEUSDT'), E: -1 },
        ]),
      ),
    ).toEqual([
      {
        provider: 'binance',
        symbol: 'NEWUSDT',
        eventTime: new Date(1672515782136),
        receivedAt,
      },
      {
        provider: 'binance',
        symbol: '币安人生USDT',
        eventTime: new Date(1672515782136),
        receivedAt,
      },
    ]);
  });

  it.each(['not-json', '{}', JSON.stringify({ e: '24hrMiniTicker' })])(
    'ignores malformed array payload %s',
    (message) => {
      expect(
        new BinanceSpotSymbolActivityClient('wss://example.com').normalize(
          message,
        ),
      ).toEqual([]);
    },
  );

  it('delivers activity from the official all-market stream', () => {
    const socket = createSocket();
    const createWebSocket = jest.fn<(url: string) => WebSocket>(() => socket);
    const observer = jest.fn<(event: SpotSymbolActivityStreamEvent) => void>();
    const client = new BinanceSpotSymbolActivityClient(
      'wss://data-stream.binance.vision/',
      createWebSocket,
      () => receivedAt,
    );

    client.start(observer);
    socket.emit('open');
    socket.emit('message', Buffer.from(JSON.stringify([ticker('NEWUSDT')])));

    expect(createWebSocket).toHaveBeenCalledWith(
      'wss://data-stream.binance.vision/ws/!miniTicker@arr',
    );
    expect(observer).toHaveBeenNthCalledWith(1, {
      type: 'connected',
      observedAt: receivedAt,
    });
    expect(observer.mock.calls[1]?.[0]).toMatchObject({
      type: 'activity',
      activity: { symbol: 'NEWUSDT' },
    });
    client.stop();
  });

  it('reconnects with bounded exponential backoff and reports lifecycle', () => {
    jest.useFakeTimers();
    try {
      const sockets = [createSocket(), createSocket(), createSocket()];
      const createWebSocket = jest
        .fn<(url: string) => WebSocket>()
        .mockReturnValueOnce(sockets[0])
        .mockReturnValueOnce(sockets[1])
        .mockReturnValueOnce(sockets[2]);
      const observer =
        jest.fn<(event: SpotSymbolActivityStreamEvent) => void>();
      const client = new BinanceSpotSymbolActivityClient(
        'wss://example.com',
        createWebSocket,
        () => receivedAt,
      );

      client.start(observer);
      sockets[0].emit('close');
      expect(observer).toHaveBeenLastCalledWith({
        type: 'disconnected',
        observedAt: receivedAt,
        reconnectAttempt: 1,
        reconnectDelayMs: 1000,
      });
      jest.advanceTimersByTime(1000);
      sockets[1].emit('close');
      jest.advanceTimersByTime(2000);
      expect(createWebSocket).toHaveBeenCalledTimes(3);
      client.stop();
    } finally {
      jest.useRealTimers();
    }
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

function ticker(symbol: string): Record<string, unknown> {
  return { e: '24hrMiniTicker', E: 1672515782136, s: symbol };
}
