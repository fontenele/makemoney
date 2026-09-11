import { BinancePublicTradesClient } from './binance-public-trades.client';

describe('BinancePublicTradesClient', () => {
  const receivedAt = new Date('2026-09-11T12:00:00.000Z');
  const client = new BinancePublicTradesClient(
    'wss://stream.binance.com:9443',
    undefined,
    () => receivedAt,
  );

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
});
