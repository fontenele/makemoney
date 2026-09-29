import { jest } from '@jest/globals';
import { PredictionMarketTokenParentUnavailableError } from '../domain/prediction-market-token-parent';
import { PolymarketClobMarketByTokenClient } from './polymarket-clob-market-by-token.client';

describe('PolymarketClobMarketByTokenClient', () => {
  const receivedAt = new Date('2026-09-29T12:00:00Z');
  const conditionId = `0x${'a'.repeat(64)}`;
  const payload = {
    condition_id: conditionId,
    primary_token_id: '111',
    secondary_token_id: '222',
  };

  it.each([
    ['111', 'yes'],
    ['222', 'no'],
  ] as const)('normalizes the requested %s token as %s', (tokenId, side) => {
    const client = new PolymarketClobMarketByTokenClient(
      'https://clob.polymarket.com',
      jest.fn(),
      () => receivedAt,
    );

    expect(client.normalize(tokenId, payload)).toEqual({
      provider: 'polymarket',
      requestedTokenId: tokenId,
      requestedOutcome: side,
      conditionId,
      outcomes: {
        yes: { tokenId: '111' },
        no: { tokenId: '222' },
      },
      source: 'clob-market-by-token',
      receivedAt,
      executable: false,
    });
  });

  it.each([
    {},
    { ...payload, condition_id: 'abc' },
    { ...payload, primary_token_id: 111 },
    { ...payload, primary_token_id: '01' },
    { ...payload, secondary_token_id: '111' },
    { ...payload, primary_token_id: '222', secondary_token_id: '333' },
  ])('rejects malformed or incoherent payload %#', (value) => {
    const client = new PolymarketClobMarketByTokenClient(
      'https://clob.polymarket.com',
    );
    expect(() => client.normalize('111', value)).toThrow(
      'Invalid Polymarket market-by-token payload',
    );
  });

  it('loads the parent identity without credentials', async () => {
    const http = jest
      .fn<(input: string, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValue(new Response(JSON.stringify(payload)));
    const client = new PolymarketClobMarketByTokenClient(
      'https://clob.polymarket.com/',
      http,
      () => receivedAt,
    );

    await expect(client.getByToken('111')).resolves.toMatchObject({
      requestedTokenId: '111',
      requestedOutcome: 'yes',
    });
    expect(http.mock.calls[0]?.[0]).toBe(
      'https://clob.polymarket.com/markets-by-token/111',
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
        new PolymarketClobMarketByTokenClient(
          'https://clob.polymarket.com',
          http,
        ).getByToken(tokenId),
      ).rejects.toThrow('Invalid Polymarket token identity');
      expect(http).not.toHaveBeenCalled();
    },
  );

  it.each([400, 404])(
    'maps provider status %s to explicit unavailability',
    async (status) => {
      const http = jest
        .fn<(input: string, init?: RequestInit) => Promise<Response>>()
        .mockResolvedValue(new Response(null, { status }));
      await expect(
        new PolymarketClobMarketByTokenClient(
          'https://clob.polymarket.com',
          http,
        ).getByToken('111'),
      ).rejects.toThrow(PredictionMarketTokenParentUnavailableError);
    },
  );

  it('rejects other unsuccessful provider responses', async () => {
    const http = jest
      .fn<(input: string, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValue(new Response(null, { status: 503 }));
    await expect(
      new PolymarketClobMarketByTokenClient(
        'https://clob.polymarket.com',
        http,
      ).getByToken('111'),
    ).rejects.toThrow('Polymarket market-by-token request failed: 503');
  });
});
