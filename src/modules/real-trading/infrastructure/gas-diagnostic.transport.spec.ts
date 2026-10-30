import { jest } from '@jest/globals';
import { createHash } from 'node:crypto';
import { GasDiagnosticCliTransport } from './gas-diagnostic.transport';
const hash = '0x' + '1'.repeat(64);
const wallet = '0x' + 'a'.repeat(40);
const walletHash = createHash('sha256').update(wallet).digest('hex');
function harness(
  options: {
    gas?: string;
    status?: string;
    sender?: string;
    finalized?: string;
    orderId?: string;
  } = {},
) {
  const run = jest
    .fn<(args: readonly string[]) => Promise<unknown>>()
    .mockImplementation((args) =>
      Promise.resolve(
        args[0] === 'cli-check'
          ? {
              success: true,
              data: { currentCliVersion: '1.10.0', needUpdateCli: false },
            }
          : args[1] === 'swap'
            ? { success: true, data: { orderId: '123' } }
            : {
                success: true,
                data: {
                  total: 1,
                  list: [
                    {
                      orderType: 'market',
                      orderId: options.orderId ?? '123',
                      chain: '56',
                      fromToken: '0x55d398326f99059ff775485246999027b3197955',
                      toToken: '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c',
                      fromTokenQty: '1',
                      status: 'FINISHED',
                      txHash: hash,
                    },
                  ],
                },
              },
      ),
    );
  const http = jest.fn<typeof fetch>().mockResolvedValue(
    Response.json([
      { id: 1, result: '0x38' },
      { id: 2, result: { hash, from: options.sender ?? wallet } },
      {
        id: 3,
        result: {
          transactionHash: hash,
          gasUsed: options.gas ?? '0x5208',
          effectiveGasPrice: '0x3b9aca00',
          blockNumber: '0x10',
          status: options.status ?? '0x1',
        },
      },
      { id: 4, result: { number: options.finalized ?? '0x11' } },
    ]),
  );
  return { run, http, transport: new GasDiagnosticCliTransport({ run }, http) };
}
describe('gas diagnostic transport', () => {
  it('builds only the fixed one-USDT BTCB buy with MEV and bounded slippage', async () => {
    const h = harness();
    await expect(h.transport.submit('0.005')).resolves.toBe('123');
    const args = h.run.mock.calls.at(-1)?.[0];
    expect(args).toContain('swap');
    expect(args?.[3]).toBe('1');
    expect(args).toContain('0.5');
    expect(args).toContain('MEDIUM');
  });
  it.each(['0.006', '-1', 'NaN'])(
    'blocks invalid slippage %s before any CLI call',
    async (rate) => {
      const h = harness();
      await expect(h.transport.submit(rate)).rejects.toThrow();
      expect(h.run).not.toHaveBeenCalled();
    },
  );
  it('measures exact receipt gas with integer arithmetic', async () => {
    const h = harness();
    await expect(h.transport.measure('123', walletHash)).resolves.toMatchObject(
      {
        measuredNetworkFeeBnb: '0.000021',
        gasUsed: '21000',
        effectiveGasPriceWei: '1000000000',
        executionSucceeded: true,
      },
    );
    expect(h.run.mock.calls.every(([args]) => !args.includes('swap'))).toBe(
      true,
    );
  });
  it('counts gas from failed transactions without reporting successful execution', async () => {
    const h = harness({ status: '0x0' });
    await expect(h.transport.measure('123', walletHash)).resolves.toMatchObject(
      {
        measuredNetworkFeeBnb: '0.000021',
        receiptSucceeded: false,
        executionSucceeded: false,
      },
    );
  });
  it('waits for finality rather than treating an unfinalized receipt as measured', async () => {
    const h = harness({ finalized: '0xf' });
    await expect(h.transport.measure('123', walletHash)).resolves.toMatchObject(
      { gasMeasurementAvailable: false, reason: 'awaiting_finality' },
    );
  });
  it.each([
    { sender: '0x' + 'b'.repeat(40) },
    { gas: '-1' },
    { orderId: 'different' },
  ])('rejects divergent or invalid receipt facts %j', async (options) => {
    const h = harness(options);
    await expect(h.transport.measure('123', walletHash)).rejects.toThrow();
  });
});
