import { jest } from '@jest/globals';
import {
  diagnosticBundle,
  diagnosticPlan,
} from '../../../../test/fixtures/diagnostic-report';
import { BscDiagnosticReceiptsReader } from './bsc-diagnostic-receipts.reader';

type Rpc = { id: number; method: string; params: unknown[] };
function harness(fault = '') {
  const bundle = diagnosticBundle();
  const rows = [bundle.swap, bundle.approval, bundle.revocation];
  const hex = (value: string) => '0x' + BigInt(value).toString(16);
  const word = (value: string) =>
    '0x' + BigInt(value).toString(16).padStart(64, '0');
  const calls: Rpc[] = [];
  const http = jest.fn<typeof fetch>((_url, init) => {
    const requests = JSON.parse(init!.body as string) as Rpc[];
    calls.push(...requests);
    const result = (request: Rpc): unknown => {
      if (request.method === 'eth_chainId')
        return fault === 'chain' ? '0x1' : '0x38';
      if (request.method === 'eth_getBlockByNumber') {
        if (request.params[0] === 'finalized')
          return { number: hex(bundle.finalizedBlockNumber) };
        return {
          hash:
            fault === 'block'
              ? '0x' + 'f'.repeat(64)
              : rows.find((row) => hex(row.blockNumber) === request.params[0])!
                  .blockHash,
        };
      }
      if (request.method === 'eth_call') {
        const call = request.params[0] as { data: string };
        return call.data === '0x313ce567'
          ? fault === 'abi'
            ? '0x12'
            : word('18')
          : word('0');
      }
      const row = rows.find((row) => row.hash === request.params[0])!;
      if (request.method === 'eth_getTransactionByHash')
        return {
          hash: row.hash,
          from: row.from,
          to: row.to,
          input: row.input,
          nonce: hex(row.nonce),
          value: hex(row.valueWei),
          blockHash: row.blockHash,
          blockNumber: hex(row.blockNumber),
        };
      return {
        transactionHash: row.hash,
        blockHash: row.blockHash,
        blockNumber: hex(row.blockNumber),
        gasUsed: hex(row.gasUsed),
        effectiveGasPrice: hex(row.effectiveGasPriceWei),
        status: '0x1',
        logs: row.logs,
      };
    };
    return Promise.resolve(
      Response.json(
        requests.map((request) => ({
          jsonrpc: '2.0',
          id: fault === 'duplicate' ? 1 : request.id,
          result: result(request),
        })),
      ),
    );
  });
  return {
    reader: new BscDiagnosticReceiptsReader(http),
    http,
    calls,
    request: {
      swapHash: bundle.swap.hash,
      approvalHash: bundle.approval.hash,
      revocationHash: bundle.revocation.hash,
      walletHash: diagnosticPlan().walletHash,
    },
  };
}
describe('BSC diagnostic receipt reader', () => {
  it('uses only public reads and decodes padded ABI words exactly', async () => {
    const test = harness();
    await expect(test.reader.load(test.request)).resolves.toMatchObject({
      currentAllowanceRaw: '0',
      usdtDecimals: 18,
      swap: { gasUsed: '843353' },
    });
    expect(test.http).toHaveBeenCalledTimes(2);
    expect(
      test.calls
        .filter((call) => call.method === 'eth_call')
        .every((call) => call.params[1] === 'latest'),
    ).toBe(true);
    expect(
      test.calls.every((call) =>
        [
          'eth_chainId',
          'eth_getBlockByNumber',
          'eth_call',
          'eth_getTransactionByHash',
          'eth_getTransactionReceipt',
        ].includes(call.method),
      ),
    ).toBe(true);
  });
  it.each(['chain', 'block', 'abi', 'duplicate'])(
    'rejects inconsistent %s evidence',
    async (fault) => {
      const test = harness(fault);
      await expect(test.reader.load(test.request)).rejects.toThrow();
    },
  );
  it('rejects malformed identity before network access', async () => {
    const test = harness();
    await expect(
      test.reader.load({ ...test.request, swapHash: 'https://example.org' }),
    ).rejects.toThrow();
    expect(test.http).not.toHaveBeenCalled();
  });
});
