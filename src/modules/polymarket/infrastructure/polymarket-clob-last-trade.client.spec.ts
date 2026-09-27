import { jest } from '@jest/globals';
import { PredictionMarketLastTradeUnavailableError } from '../domain/prediction-market-last-trade';
import { PolymarketClobLastTradeClient } from './polymarket-clob-last-trade.client';

describe('PolymarketClobLastTradeClient', () => {
  const receivedAt = new Date('2026-09-27T12:00:00.000Z');

  it.each([
    ['BUY', 'buy'],
    ['SELL', 'sell'],
  ] as const)(
    'normalizes an exact non-executable %s trade',
    (side, expected) => {
      const client = new PolymarketClobLastTradeClient(
        'https://clob.polymarket.com',
        jest.fn(),
        () => receivedAt,
      );

      expect(client.normalize('111', { price: '0.0800', side })).toEqual({
        provider: 'polymarket',
        tokenId: '111',
        price: '0.0800',
        side: expected,
        source: 'clob-last-trade',
        executable: false,
        providerTimestamp: null,
        receivedAt,
      });
    },
  );

  it('represents the documented never-traded placeholder as unavailable', () => {
    const client = new PolymarketClobLastTradeClient(
      'https://clob.polymarket.com',
    );

    expect(() => client.normalize('111', { price: '0.5', side: '' })).toThrow(
      PredictionMarketLastTradeUnavailableError,
    );
  });

  it.each([
    {},
    { price: 0.08, side: 'BUY' },
    { price: '.08', side: 'BUY' },
    { price: '1.01', side: 'BUY' },
    { price: '0.08', side: 'buy' },
    { price: '0.6', side: '' },
  ])('rejects malformed last-trade payload %#', (payload) => {
    const client = new PolymarketClobLastTradeClient(
      'https://clob.polymarket.com',
    );
    expect(() => client.normalize('111', payload)).toThrow(
      'Invalid Polymarket last-trade payload',
    );
  });

  it('loads the last trade by canonical token ID without credentials', async () => {
    const http = jest
      .fn<(input: string, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValue(
        new Response(JSON.stringify({ price: '0.08', side: 'SELL' })),
      );
    const client = new PolymarketClobLastTradeClient(
      'https://clob.polymarket.com/',
      http,
      () => receivedAt,
    );

    await expect(client.getLastTrade('111')).resolves.toMatchObject({
      tokenId: '111',
      price: '0.08',
      side: 'sell',
    });
    expect(http.mock.calls[0]?.[0]).toBe(
      'https://clob.polymarket.com/last-trade-price?token_id=111',
    );
    expect(http.mock.calls[0]?.[1]).toMatchObject({
      headers: { accept: 'application/json' },
    });
    expect(http.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it.each(['', '01', '-1', '1.5', 'abc', '1'.repeat(79)])(
    'rejects invalid token identity %s before HTTP',
    async (tokenId) => {
      const http =
        jest.fn<(input: string, init?: RequestInit) => Promise<Response>>();
      await expect(
        new PolymarketClobLastTradeClient(
          'https://clob.polymarket.com',
          http,
        ).getLastTrade(tokenId),
      ).rejects.toThrow('Invalid Polymarket token identity');
      expect(http).not.toHaveBeenCalled();
    },
  );

  it.each([400, 404])(
    'distinguishes provider last-trade unavailability status %s from failure',
    async (status) => {
      const http = jest
        .fn<(input: string, init?: RequestInit) => Promise<Response>>()
        .mockResolvedValue(new Response(null, { status }));

      await expect(
        new PolymarketClobLastTradeClient(
          'https://clob.polymarket.com',
          http,
        ).getLastTrade('111'),
      ).rejects.toThrow(PredictionMarketLastTradeUnavailableError);
    },
  );

  it('rejects other unsuccessful provider responses', async () => {
    const http = jest
      .fn<(input: string, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValue(new Response(null, { status: 503 }));

    await expect(
      new PolymarketClobLastTradeClient(
        'https://clob.polymarket.com',
        http,
      ).getLastTrade('111'),
    ).rejects.toThrow('Polymarket last-trade request failed: 503');
  });
});
