import { EventEmitter } from 'node:events';
import { jest } from '@jest/globals';
import WebSocket from 'ws';
import { BinancePublicTradesClient } from './binance-public-trades.client';

describe('BinancePublicTradesClient', () => {
  const receivedAt = new Date('2026-09-11T12:00:00.000Z');
  const client = new BinancePublicTradesClient(
    'wss://stream.binance.com:9443',
    undefined,
    () => receivedAt,
  );

  afterEach(() => {
    jest.useRealTimers();
  });

  it('normalizes a Binance BTC/USDT trade without numeric conversion', () => {
    const message = JSON.stringify({
      e: 'trade',
      E: 1672515782136,
      s: 'BTCUSDT',
      t: 12345,
      p: '77341.20000000',
      q: '0.00125000',
      T: 1672515782100,
      m: true,
      M: true,
    });

    expect(client.normalize(message)).toEqual({
      provider: 'binance',
      symbol: 'BTC/USDT',
      tradeId: '12345',
      price: '77341.20000000',
      quantity: '0.00125000',
      takerSide: 'sell',
      eventTime: new Date(1672515782136),
      tradeTime: new Date(1672515782100),
      receivedAt,
    });
  });

  it('maps a non-maker buyer to a buy taker side', () => {
    const message = JSON.stringify({
      e: 'trade',
      E: 1672515782136,
      s: 'BTCUSDT',
      t: 12346,
      p: '77342.80',
      q: '0.01',
      T: 1672515782136,
      m: false,
    });

    expect(client.normalize(message)?.takerSide).toBe('buy');
  });

  it.each([
    'not-json',
    JSON.stringify({ e: 'ticker' }),
    JSON.stringify({
      e: 'trade',
      E: 1672515782136,
      s: 'ETHUSDT',
      t: 12345,
      p: 'invalid',
      q: '0.01',
      T: 1672515782136,
      m: false,
    }),
  ])('ignores an invalid or unexpected payload', (message) => {
    expect(client.normalize(message)).toBeNull();
  });

  it('reconnects with exponential backoff after unexpected closes', () => {
    jest.useFakeTimers();
    const sockets = [createSocket(), createSocket(), createSocket()];
    const createWebSocket = jest
      .fn<(url: string) => WebSocket>()
      .mockReturnValueOnce(sockets[0])
      .mockReturnValueOnce(sockets[1])
      .mockReturnValueOnce(sockets[2]);
    const reconnectingClient = new BinancePublicTradesClient(
      'wss://stream.binance.com:9443/',
      createWebSocket,
    );

    reconnectingClient.start(jest.fn());
    sockets[0].emit('close');

    jest.advanceTimersByTime(999);
    expect(createWebSocket).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(1);
    expect(createWebSocket).toHaveBeenCalledTimes(2);

    sockets[1].emit('close');
    jest.advanceTimersByTime(1_999);
    expect(createWebSocket).toHaveBeenCalledTimes(2);
    jest.advanceTimersByTime(1);
    expect(createWebSocket).toHaveBeenCalledTimes(3);
    expect(createWebSocket).toHaveBeenNthCalledWith(
      1,
      'wss://stream.binance.com:9443/ws/btcusdt@trade',
    );

    reconnectingClient.stop();
  });

  it('resets the reconnect delay after a successful connection', () => {
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
    const reconnectingClient = new BinancePublicTradesClient(
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

  it('caps the reconnect delay at thirty seconds', () => {
    jest.useFakeTimers();
    const sockets: TestWebSocket[] = [];
    const createWebSocket = jest.fn<(url: string) => WebSocket>(() => {
      const socket = createSocket();
      sockets.push(socket);
      return socket;
    });
    const reconnectingClient = new BinancePublicTradesClient(
      'wss://stream.binance.com:9443',
      createWebSocket,
    );

    reconnectingClient.start(jest.fn());

    for (const [index, delayMs] of [
      1_000, 2_000, 4_000, 8_000, 16_000, 30_000, 30_000,
    ].entries()) {
      sockets[sockets.length - 1].emit('close');
      jest.advanceTimersByTime(delayMs - 1);
      expect(createWebSocket).toHaveBeenCalledTimes(index + 1);
      jest.advanceTimersByTime(1);
      expect(createWebSocket).toHaveBeenCalledTimes(index + 2);
    }

    reconnectingClient.stop();
  });

  it('cancels pending reconnection and closes the socket on shutdown', () => {
    jest.useFakeTimers();
    const firstSocket = createSocket();
    const secondSocket = createSocket();
    const createWebSocket = jest
      .fn<(url: string) => WebSocket>()
      .mockReturnValueOnce(firstSocket)
      .mockReturnValueOnce(secondSocket);
    const reconnectingClient = new BinancePublicTradesClient(
      'wss://stream.binance.com:9443',
      createWebSocket,
    );

    reconnectingClient.start(jest.fn());
    firstSocket.emit('close');
    reconnectingClient.stop();
    jest.runAllTimers();

    expect(createWebSocket).toHaveBeenCalledTimes(1);

    reconnectingClient.start(jest.fn());
    reconnectingClient.stop();
    secondSocket.emit('close');
    jest.runAllTimers();

    expect(secondSocket.closeMock).toHaveBeenCalledTimes(1);
    expect(createWebSocket).toHaveBeenCalledTimes(2);
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
