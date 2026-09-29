import { jest } from '@jest/globals';
import { PredictionMarketMidpointUnavailableError } from '../domain/prediction-market-midpoint';
import { PolymarketClobMidpointClient } from './polymarket-clob-midpoint.client';

describe('PolymarketClobMidpointClient', () => {
  const receivedAt = new Date('2026-09-26T18:00:00.000Z');

  it('normalizes an exact non-executable midpoint observation', () => {
    const client = new PolymarketClobMidpointClient(
      'https://clob.polymarket.com',
      jest.fn(),
      () => receivedAt,
    );

    expect(client.normalize('111', { mid: '0.4500' })).toEqual({
      provider: 'polymarket',
      tokenId: '111',
      price: '0.4500',
      source: 'clob-midpoint',
      executable: false,
      providerTimestamp: null,
      receivedAt,
    });
  });

  it.each([
    {},
    { mid: 0.45 },
    { mid: '.45' },
    { mid: '01' },
    { mid: '-0.1' },
    { mid: '1.01' },
    { mid: 'NaN' },
    { mid_price: '0.45' },
  ])('rejects malformed midpoint payload %#', (payload) => {
    const client = new PolymarketClobMidpointClient(
      'https://clob.polymarket.com',
    );
    expect(() => client.normalize('111', payload)).toThrow(
      'Invalid Polymarket midpoint payload',
    );
  });

  it('loads a midpoint by canonical token ID without credentials', async () => {
    const http = jest
      .fn<(input: string, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValue(new Response(JSON.stringify({ mid: '0.45' })));
    const client = new PolymarketClobMidpointClient(
      'https://clob.polymarket.com/',
      http,
      () => receivedAt,
    );

    await expect(client.getMidpoint('111')).resolves.toMatchObject({
      tokenId: '111',
      price: '0.45',
    });
    expect(http.mock.calls[0]?.[0]).toBe(
      'https://clob.polymarket.com/midpoint?token_id=111',
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
        new PolymarketClobMidpointClient(
          'https://clob.polymarket.com',
          http,
        ).getMidpoint(tokenId),
      ).rejects.toThrow('Invalid Polymarket token identity');
      expect(http).not.toHaveBeenCalled();
    },
  );

  it.each([400, 404])(
    'distinguishes provider midpoint unavailability status %s from failure',
    async (status) => {
      const http = jest
        .fn<(input: string, init?: RequestInit) => Promise<Response>>()
        .mockResolvedValue(new Response(null, { status }));

      await expect(
        new PolymarketClobMidpointClient(
          'https://clob.polymarket.com',
          http,
        ).getMidpoint('111'),
      ).rejects.toThrow(PredictionMarketMidpointUnavailableError);
    },
  );

  it('rejects other unsuccessful provider responses', async () => {
    const http = jest
      .fn<(input: string, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValue(new Response(null, { status: 503 }));

    await expect(
      new PolymarketClobMidpointClient(
        'https://clob.polymarket.com',
        http,
      ).getMidpoint('111'),
    ).rejects.toThrow('Polymarket midpoint request failed: 503');
  });
});
