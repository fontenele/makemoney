import { jest } from '@jest/globals';

import { AgenticWalletFundingConversionTransactionReceiptAdapter } from './agentic-wallet-funding-conversion-transaction-receipt.adapter';
import {
  BSC_NATIVE_BNB_ADDRESS,
  BSC_USDT_ADDRESS,
} from './agentic-wallet-funding-conversion-quote.adapter';

const HASH = `0x${'a'.repeat(64)}`;
const WALLET = '0x1111111111111111111111111111111111111111';
const ROUTER = '0x2222222222222222222222222222222222222222';
const BLOCK_HASH = `0x${'b'.repeat(64)}`;

describe('AgenticWalletFundingConversionTransactionReceiptAdapter', () => {
  it('reads one finalized successful BSC receipt', async () => {
    const http = httpResponses(receipt(), block());
    const reader = createReader(http);

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
    expect(http).toHaveBeenCalledTimes(2);
  });

  it('rejects an invalid hash before invoking the RPC', async () => {
    const http = jest.fn<typeof fetch>();
    await expect(createReader(http).load('invalid')).rejects.toThrow(
      'hash is invalid',
    );
    expect(http).not.toHaveBeenCalled();
  });

  it.each([
    ['failed receipt', () => set(receipt(), [1, 'result', 'status'], '0x0')],
    [
      'unfinalized receipt',
      () => set(receipt(), [2, 'result', 'number'], '0xf'),
    ],
    [
      'wrong transaction sender',
      () =>
        set(
          receipt(),
          [0, 'result', 'from'],
          '0x3333333333333333333333333333333333333333',
        ),
    ],
    [
      'invalid chain timestamp',
      () => ({
        receipt: receipt(),
        block: set(block(), ['result', 'timestamp'], 'invalid'),
      }),
    ],
    [
      'wrong receive token',
      () =>
        set(
          receipt(),
          [1, 'result', 'logs', 0, 'address'],
          BSC_NATIVE_BNB_ADDRESS,
        ),
    ],
    [
      'multiple target credits',
      () => {
        const value = receipt();
        value[1].result.logs.push(structuredClone(value[1].result.logs[0]));
        return value;
      },
    ],
    ['zero gas', () => set(receipt(), [1, 'result', 'gasUsed'], '0x0')],
  ])('rejects %s', async (_label, change) => {
    const changed = change();
    const changedReceipt = 'receipt' in changed ? changed.receipt : changed;
    const changedBlock = 'block' in changed ? changed.block : block();
    const http = httpResponses(changedReceipt, changedBlock);
    await expect(createReader(http).load(HASH)).rejects.toThrow(
      'receipt is invalid',
    );
  });
});

function createReader(http: jest.MockedFunction<typeof fetch>) {
  return new AgenticWalletFundingConversionTransactionReceiptAdapter(
    http,
    () => new Date('2026-10-24T12:00:00.000Z'),
  );
}

function httpResponses(receiptResponse: unknown, blockResponse: unknown) {
  return jest
    .fn<typeof fetch>()
    .mockResolvedValueOnce(
      new Response(JSON.stringify(receiptResponse), { status: 200 }),
    )
    .mockResolvedValueOnce(
      new Response(JSON.stringify(blockResponse), { status: 200 }),
    );
}

function receipt() {
  return [
    {
      jsonrpc: '2.0',
      id: 1,
      result: {
        hash: HASH,
        chainId: '0x38',
        from: WALLET,
        to: ROUTER,
        value: '0x1c6bf526340000',
        blockNumber: '0x10',
        blockHash: BLOCK_HASH,
      },
    },
    {
      jsonrpc: '2.0',
      id: 2,
      result: {
        transactionHash: HASH,
        from: WALLET,
        to: ROUTER,
        status: '0x1',
        blockNumber: '0x10',
        blockHash: BLOCK_HASH,
        gasUsed: '0x2710',
        effectiveGasPrice: '0x3b9aca00',
        logs: [
          {
            address: BSC_USDT_ADDRESS,
            topics: [
              '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
              `0x${ROUTER.slice(2).padStart(64, '0')}`,
              `0x${WALLET.slice(2).padStart(64, '0')}`,
            ],
            data: '0x51e102bd8ece0000',
          },
        ],
      },
    },
    { jsonrpc: '2.0', id: 3, result: { number: '0x11' } },
  ];
}

function block() {
  return {
    jsonrpc: '2.0',
    id: 4,
    result: {
      hash: BLOCK_HASH,
      number: '0x10',
      timestamp: '0x6adc9d84',
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
