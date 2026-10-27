import { jest } from '@jest/globals';

import { BscFundingConversionPreBalanceReader } from './bsc-funding-conversion-pre-balance.reader';

const WALLET = '0x1111111111111111111111111111111111111111';

describe('BscFundingConversionPreBalanceReader', () => {
  it('reads native BNB and USDT at one exact BSC block', async () => {
    const http = jest
      .fn<(input: string, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValueOnce(
        response({ jsonrpc: '2.0', id: 1, result: { number: '0x10' } }),
      )
      .mockResolvedValueOnce(
        response([
          { jsonrpc: '2.0', id: 3, result: '0x8ac7230489e80000' },
          { jsonrpc: '2.0', id: 2, result: '0x21e19e0c9bab2400000' },
        ]),
      );
    const reader = new BscFundingConversionPreBalanceReader(
      http,
      () => new Date('2026-10-23T20:00:00.000Z'),
    );

    await expect(reader.load(WALLET)).resolves.toEqual({
      scope: 'agentic_wallet_funding_conversion_pre_balance_snapshot',
      chainId: '56',
      walletAddress: WALLET,
      blockNumber: '0x10',
      bnbBalance: '10000',
      usdtBalance: '10',
      observedAt: new Date('2026-10-23T20:00:00.000Z'),
    });
    expect(JSON.parse(requestBody(http, 1))).toEqual([
      expect.objectContaining({
        method: 'eth_getBalance',
        params: [WALLET, '0x10'],
      }),
      expect.objectContaining({
        method: 'eth_call',
        params: [
          expect.objectContaining({
            data: `0x70a08231${WALLET.slice(2).padStart(64, '0')}`,
          }),
          '0x10',
        ],
      }),
    ]);
    expect(JSON.parse(requestBody(http, 0))).toMatchObject({
      method: 'eth_getBlockByNumber',
      params: ['finalized', false],
    });
  });

  it('rejects an invalid wallet before HTTP access', async () => {
    const http =
      jest.fn<(input: string, init?: RequestInit) => Promise<Response>>();
    const reader = new BscFundingConversionPreBalanceReader(http);
    await expect(reader.load('invalid')).rejects.toThrow('address is invalid');
    expect(http).not.toHaveBeenCalled();
  });

  it('accepts the zero-padded EVM word returned for a zero token balance', async () => {
    const http = jest
      .fn<(input: string, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValueOnce(
        response({ jsonrpc: '2.0', id: 1, result: { number: '0x10' } }),
      )
      .mockResolvedValueOnce(
        response([
          { jsonrpc: '2.0', id: 2, result: '0x1' },
          {
            jsonrpc: '2.0',
            id: 3,
            result: `0x${'0'.repeat(64)}`,
          },
        ]),
      );

    await expect(
      new BscFundingConversionPreBalanceReader(http).load(WALLET),
    ).resolves.toMatchObject({
      bnbBalance: '0.000000000000000001',
      usdtBalance: '0',
    });
  });

  it.each([
    [{ jsonrpc: '2.0', id: 1, result: { number: '10' } }],
    [{ jsonrpc: '2.0', id: 1, result: { number: '0x01' } }],
  ])('rejects malformed block quantity %#', async (payload) => {
    const reader = new BscFundingConversionPreBalanceReader(
      jest
        .fn<(input: string, init?: RequestInit) => Promise<Response>>()
        .mockResolvedValue(response(payload)),
    );
    await expect(reader.load(WALLET)).rejects.toThrow('quantity is invalid');
  });

  it('rejects incomplete or duplicate balance responses', async () => {
    const http = jest
      .fn<(input: string, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValueOnce(
        response({ jsonrpc: '2.0', id: 1, result: { number: '0x10' } }),
      )
      .mockResolvedValueOnce(
        response([
          { jsonrpc: '2.0', id: 2, result: '0x0' },
          { jsonrpc: '2.0', id: 2, result: '0x0' },
        ]),
      );
    await expect(
      new BscFundingConversionPreBalanceReader(http).load(WALLET),
    ).rejects.toThrow('identity is invalid');
  });
});

function response(value: unknown): Response {
  return { ok: true, json: () => Promise.resolve(value) } as Response;
}

function requestBody(
  http: jest.Mock<(input: string, init?: RequestInit) => Promise<Response>>,
  callIndex: number,
): string {
  const body = http.mock.calls[callIndex]?.[1]?.body;
  if (typeof body !== 'string') {
    throw new Error('Expected a string request body');
  }
  return body;
}
