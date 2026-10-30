import { jest } from '@jest/globals';
import {
  cleanupNow,
  cleanupReceipt,
  cleanupSubmitted,
} from '../../../../test/fixtures/approval-cleanup';
import { BscApprovalCleanupReader } from './bsc-approval-cleanup.reader';
import { transitionApprovalCleanup } from '../application/approval-cleanup';
type Rpc = { id: number; method: string; params: unknown[] };
function harness(fault = '') {
  const evidence = cleanupReceipt();
  const r = evidence.receipt;
  if (fault === 'sender') r.from = '0x' + 'c'.repeat(40);
  if (fault === 'reverted') r.succeeded = false;
  const hex = (v: string) => '0x' + BigInt(v).toString(16);
  const methods: string[] = [];
  const http = jest.fn<typeof fetch>((_url, init) => {
    const requests = JSON.parse(init!.body as string) as Rpc[];
    const response = (q: Rpc): unknown => {
      methods.push(q.method);
      if (q.method === 'eth_chainId') return fault === 'chain' ? '0x1' : '0x38';
      if (q.method === 'eth_getTransactionByHash')
        return {
          hash: r.hash,
          from: r.from,
          to: r.to,
          input: r.input,
          nonce: hex(r.nonce),
          value: hex(r.valueWei),
          blockHash: r.blockHash,
          blockNumber: hex(r.blockNumber),
        };
      if (q.method === 'eth_getTransactionReceipt')
        return {
          transactionHash: r.hash,
          blockHash: r.blockHash,
          blockNumber: hex(r.blockNumber),
          gasUsed: hex(r.gasUsed),
          effectiveGasPrice: hex(r.effectiveGasPriceWei),
          status: r.succeeded ? '0x1' : '0x0',
          logs: [],
        };
      if (q.method === 'eth_getBlockByNumber')
        return q.params[0] === 'finalized'
          ? {
              number:
                fault === 'unfinalized'
                  ? '0x1'
                  : hex(evidence.finalizedBlockNumber),
            }
          : {
              hash: fault === 'canonical' ? '0x' + 'f'.repeat(64) : r.blockHash,
            };
      if (q.method === 'eth_call') {
        expect(q.params[1]).toBe('latest');
        return fault === 'abi'
          ? '0x0'
          : '0x' + '0'.repeat(63) + (fault === 'allowance' ? '1' : '0');
      }
      throw new Error('Unexpected RPC method');
    };
    return Promise.resolve(
      Response.json(
        requests.map((q) => ({
          id: fault === 'duplicate' ? 1 : q.id,
          jsonrpc: '2.0',
          result: response(q),
        })),
      ),
    );
  });
  return {
    reader: new BscApprovalCleanupReader(http, () => cleanupNow),
    http,
    methods,
  };
}
describe('BSC passive cleanup reader', () => {
  it('verifies a finalized canonical revoke using only public reads', async () => {
    const t = harness();
    const evidence = await t.reader.load(cleanupSubmitted());
    expect(
      transitionApprovalCleanup(
        cleanupSubmitted(),
        { type: 'receipt', evidence },
        cleanupNow,
      ).state,
    ).toBe('cleared');
    expect(t.http).toHaveBeenCalledTimes(2);
    expect(
      t.methods.every((method) =>
        [
          'eth_chainId',
          'eth_getTransactionByHash',
          'eth_getTransactionReceipt',
          'eth_getBlockByNumber',
          'eth_call',
        ].includes(method),
      ),
    ).toBe(true);
  });
  it.each(['chain', 'sender', 'unfinalized', 'canonical', 'abi', 'duplicate'])(
    'rejects invalid %s evidence',
    async (fault) => {
      await expect(
        harness(fault).reader.load(cleanupSubmitted()),
      ).rejects.toThrow();
    },
  );
  it.each(['reverted', 'allowance'])(
    'preserves %s evidence as unresolved charged failure',
    async (fault) => {
      const evidence = await harness(fault).reader.load(cleanupSubmitted());
      expect(
        transitionApprovalCleanup(
          cleanupSubmitted(),
          { type: 'receipt', evidence },
          cleanupNow,
        ).state,
      ).toBe('failed');
    },
  );
  it('rejects a consumed unknown attempt before network access', async () => {
    const t = harness();
    await expect(
      t.reader.load({ ...cleanupSubmitted(), state: 'unknown' }),
    ).rejects.toThrow();
    expect(t.http).not.toHaveBeenCalled();
  });
});
