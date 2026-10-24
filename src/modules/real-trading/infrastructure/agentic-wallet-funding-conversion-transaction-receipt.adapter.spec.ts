import { jest } from '@jest/globals';

import { AgenticWalletCliJsonProcess } from './agentic-wallet-cli-json-process';
import { AgenticWalletFundingConversionTransactionReceiptAdapter } from './agentic-wallet-funding-conversion-transaction-receipt.adapter';
import {
  BSC_NATIVE_BNB_ADDRESS,
  BSC_USDT_ADDRESS,
} from './agentic-wallet-funding-conversion-quote.adapter';

const HASH = `0x${'a'.repeat(64)}`;
const WALLET = '0x1111111111111111111111111111111111111111';

describe('AgenticWalletFundingConversionTransactionReceiptAdapter', () => {
  it('reads one confirmed BNB-to-USDT receipt from the pinned CLI', async () => {
    const run = jest
      .fn<(args: readonly string[]) => Promise<unknown>>()
      .mockResolvedValueOnce(version())
      .mockResolvedValueOnce(receipt());
    const reader = createReader(run);

    await expect(reader.load(HASH)).resolves.toEqual({
      scope: 'agentic_wallet_funding_conversion_transaction_receipt',
      transactionHash: HASH,
      chainId: '56',
      walletAddress: WALLET,
      sourceTokenAddress: BSC_NATIVE_BNB_ADDRESS.toLowerCase(),
      targetTokenAddress: BSC_USDT_ADDRESS.toLowerCase(),
      sourceQuantityBnb: '0.008',
      actualUsdtReceived: '5.9',
      networkFeeQuantityBnb: '0.00001',
      transactionTime: new Date('2026-10-24T11:59:00.000Z'),
      observedAt: new Date('2026-10-24T12:00:00.000Z'),
    });
    expect(run).toHaveBeenLastCalledWith(
      [
        'wallet',
        'tx-history',
        '--tx',
        HASH,
        '--binanceChainId',
        '56',
        '--json',
      ],
      undefined,
    );
  });

  it('rejects an invalid hash before invoking the CLI', async () => {
    const run = jest.fn<(args: readonly string[]) => Promise<unknown>>();
    await expect(createReader(run).load('invalid')).rejects.toThrow(
      'hash is invalid',
    );
    expect(run).not.toHaveBeenCalled();
  });

  it.each([
    [
      'pending transaction',
      () => set(receipt(), ['data', 'transactions', 0, 'status'], 'pending'),
    ],
    [
      'wrong hash',
      () =>
        set(
          receipt(),
          ['data', 'transactions', 0, 'txHash'],
          `0x${'b'.repeat(64)}`,
        ),
    ],
    [
      'zero fee',
      () =>
        set(
          receipt(),
          [
            'data',
            'transactions',
            0,
            'txHashList',
            0,
            'networkFee',
            'feeValue',
          ],
          '0',
        ),
    ],
    [
      'wrong receive token',
      () =>
        set(
          receipt(),
          [
            'data',
            'transactions',
            0,
            'txHashList',
            0,
            'instructions',
            'receive',
            0,
            'tokenInfo',
            'contractAddress',
          ],
          BSC_NATIVE_BNB_ADDRESS,
        ),
    ],
    [
      'different wallet',
      () =>
        set(
          receipt(),
          [
            'data',
            'transactions',
            0,
            'txHashList',
            0,
            'instructions',
            'receive',
            0,
            'addressInfo',
            'address',
          ],
          '0x2222222222222222222222222222222222222222',
        ),
    ],
    [
      'multiple sends',
      () => {
        const value = receipt();
        const send = value.data.transactions[0].txHashList[0].instructions.send;
        send.push(structuredClone(send[0]));
        return value;
      },
    ],
  ])('rejects %s', async (_label, change) => {
    const run = jest
      .fn<(args: readonly string[]) => Promise<unknown>>()
      .mockResolvedValueOnce(version())
      .mockResolvedValueOnce(change());
    await expect(createReader(run).load(HASH)).rejects.toThrow(
      'receipt is invalid',
    );
  });
});

function createReader(
  run: jest.Mock<(args: readonly string[]) => Promise<unknown>>,
) {
  return new AgenticWalletFundingConversionTransactionReceiptAdapter(
    { run } as unknown as AgenticWalletCliJsonProcess,
    () => new Date('2026-10-24T12:00:00.000Z'),
  );
}

function version() {
  return {
    success: true,
    data: { currentCliVersion: '1.10.0', needUpdateCli: false },
  };
}

function receipt() {
  return {
    success: true,
    data: {
      transactions: [
        {
          txType: 'swap',
          txHash: HASH,
          txTime: '2026-10-24T11:59:00.000Z',
          binanceChainId: '56',
          status: 'confirmed',
          txHashList: [
            {
              binanceChainId: '56',
              txHash: HASH,
              status: 'confirmed',
              networkFee: {
                binanceChainId: '56',
                feeTokenAddress: BSC_NATIVE_BNB_ADDRESS,
                feeTokenSymbol: 'BNB',
                feeValue: '10000000000000',
                feeTokenDecimals: 18,
              },
              instructions: {
                send: [
                  movement('8000000000000000', BSC_NATIVE_BNB_ADDRESS, 'BNB'),
                ],
                receive: [
                  movement('5900000000000000000', BSC_USDT_ADDRESS, 'USDT'),
                ],
              },
            },
          ],
        },
      ],
    },
  };
}

function movement(amount: string, contractAddress: string, symbol: string) {
  return {
    binanceChainId: '56',
    amount,
    addressInfo: { address: WALLET },
    tokenInfo: {
      binanceChainId: '56',
      contractAddress,
      symbol,
      tokenId: null,
      decimals: 18,
    },
  };
}

function set(
  value: object,
  path: readonly (string | number)[],
  changed: unknown,
) {
  let target = value as Record<string | number, unknown>;
  for (const key of path.slice(0, -1))
    target = target[key] as Record<string | number, unknown>;
  target[path.at(-1)!] = changed;
  return value;
}
