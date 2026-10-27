import { jest } from '@jest/globals';

import { APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT } from '../application/real-execution-instrument-approval';
import { BscFundingConversionAccountingSnapshotReader } from './bsc-funding-conversion-accounting-snapshot.reader';

const WALLET = '0x1111111111111111111111111111111111111111';

describe('BscFundingConversionAccountingSnapshotReader', () => {
  it('reads BNB, USDT, and BTCB at one finalized block', async () => {
    const http = jest
      .fn<(input: string, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValueOnce(
        response({ jsonrpc: '2.0', id: 1, result: { number: '0x20' } }),
      )
      .mockResolvedValueOnce(
        response([
          {
            jsonrpc: '2.0',
            id: 4,
            result:
              '0x0000000000000000000000000000000000000000000000000000000000000000',
          },
          { jsonrpc: '2.0', id: 2, result: '0xde0b6b3a7640000' },
          {
            jsonrpc: '2.0',
            id: 3,
            result:
              '0x0000000000000000000000000000000000000000000000004563918244f40000',
          },
        ]),
      );
    const reader = new BscFundingConversionAccountingSnapshotReader(
      http,
      () => new Date('2026-10-24T15:00:00.000Z'),
    );

    await expect(reader.load(WALLET)).resolves.toEqual({
      scope: 'agentic_wallet_funding_conversion_accounting_snapshot',
      chainId: '56',
      walletAddress: WALLET,
      blockNumber: '0x20',
      balances: [
        {
          assetIdentity: 'native:BNB',
          assetType: 'native',
          assetAddress: null,
          assetSymbol: 'BNB',
          quantity: '1',
        },
        {
          assetIdentity: `token:${APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT.usdt.tokenAddress}`,
          assetType: 'token',
          assetAddress:
            APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT.usdt.tokenAddress,
          assetSymbol: null,
          quantity: '5',
        },
        {
          assetIdentity: `token:${APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT.btc.tokenAddress}`,
          assetType: 'token',
          assetAddress:
            APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT.btc.tokenAddress,
          assetSymbol: null,
          quantity: '0',
        },
      ],
      observedAt: new Date('2026-10-24T15:00:00.000Z'),
    });
    const batch = JSON.parse(requestBody(http, 1)) as Array<{
      id: number;
      params: unknown[];
    }>;
    expect(batch).toHaveLength(3);
    expect(batch.map((entry) => entry.id).sort()).toEqual([2, 3, 4]);
    expect(batch[0]?.params.at(-1)).toBe('0x20');
    expect(batch[1]?.params.at(-1)).toBe('0x20');
    expect(batch[2]?.params.at(-1)).toBe('0x20');
  });

  it('rejects invalid identity and incomplete provider responses', async () => {
    const noHttp =
      jest.fn<(input: string, init?: RequestInit) => Promise<Response>>();
    await expect(
      new BscFundingConversionAccountingSnapshotReader(noHttp).load('bad'),
    ).rejects.toThrow('wallet is invalid');
    expect(noHttp).not.toHaveBeenCalled();

    const http = jest
      .fn<(input: string, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValueOnce(
        response({ jsonrpc: '2.0', id: 1, result: { number: '0x20' } }),
      )
      .mockResolvedValueOnce(
        response([
          { jsonrpc: '2.0', id: 2, result: '0x0' },
          { jsonrpc: '2.0', id: 3, result: '0x0' },
        ]),
      );
    await expect(
      new BscFundingConversionAccountingSnapshotReader(http).load(WALLET),
    ).rejects.toThrow('response is invalid');
  });

  it('rejects non-word ERC-20 balance results', async () => {
    const http = jest
      .fn<(input: string, init?: RequestInit) => Promise<Response>>()
      .mockResolvedValueOnce(
        response({ jsonrpc: '2.0', id: 1, result: { number: '0x20' } }),
      )
      .mockResolvedValueOnce(
        response([
          { jsonrpc: '2.0', id: 2, result: '0x0' },
          { jsonrpc: '2.0', id: 3, result: '0x0' },
          {
            jsonrpc: '2.0',
            id: 4,
            result:
              '0x0000000000000000000000000000000000000000000000000000000000000000',
          },
        ]),
      );

    await expect(
      new BscFundingConversionAccountingSnapshotReader(http).load(WALLET),
    ).rejects.toThrow('quantity is invalid');
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
  if (typeof body !== 'string') throw new Error('Expected request body');
  return body;
}
