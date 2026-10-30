import { createHash } from 'node:crypto';
import Decimal from 'decimal.js';
import { GasDiagnosticTransport } from '../application/gas-diagnostic.service';
import { APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT as instrument } from '../application/real-execution-instrument-approval';
import { AgenticWalletCliJsonProcess } from './agentic-wallet-cli-json-process';
import {
  buildAgenticWalletCliVersionCheckArguments,
  validateAgenticWalletCliVersion,
} from './agentic-wallet-cli-version';
import { isSafeAgenticWalletProviderOrderId } from './agentic-wallet-market-swap-submission-response';

const D = Decimal.clone({ precision: 100, toExpNeg: -100, toExpPos: 100 });
const RPC = 'https://bsc-dataseed.bnbchain.org';
const HEX = /^0x(?:0|[1-9a-f][a-f0-9]*)$/i;

export class GasDiagnosticCliTransport implements GasDiagnosticTransport {
  constructor(
    private readonly process: Pick<
      AgenticWalletCliJsonProcess,
      'run'
    > = new AgenticWalletCliJsonProcess('real execution swap'),
    private readonly http: typeof fetch = fetch,
  ) {}

  async submit(slippageRate: string): Promise<string | null> {
    if (
      !/^(?:0|0\.\d{1,18})$/.test(slippageRate) ||
      new D(slippageRate).gt('0.005')
    )
      throw new Error('Diagnostic slippage is invalid');
    validateAgenticWalletCliVersion(
      await this.process.run(buildAgenticWalletCliVersionCheckArguments()),
      'real execution swap',
    );
    const raw: unknown = await this.process.run([
      'market-order',
      'swap',
      '--fromTokenQty',
      '1',
      '--fromToken',
      instrument.usdt.tokenAddress,
      '--toToken',
      instrument.btc.tokenAddress,
      '--binanceChainId',
      '56',
      '--slippage',
      new D(slippageRate).times(100).toFixed(),
      '--mev',
      'true',
      '--gasLevel',
      'MEDIUM',
      '--json',
    ]);
    return obj(raw) &&
      raw.success === true &&
      obj(raw.data) &&
      isSafeAgenticWalletProviderOrderId(raw.data.orderId)
      ? raw.data.orderId
      : null;
  }

  async measure(orderId: string, walletHash: string) {
    if (
      !isSafeAgenticWalletProviderOrderId(orderId) ||
      !/^[a-f0-9]{64}$/.test(walletHash)
    )
      throw new Error('Invalid diagnostic identity');
    validateAgenticWalletCliVersion(
      await this.process.run(buildAgenticWalletCliVersionCheckArguments()),
      'real execution swap',
    );
    const raw: unknown = await this.process.run([
      'market-order',
      'list',
      '--orderId',
      orderId,
      '--json',
    ]);
    if (
      !obj(raw) ||
      raw.success !== true ||
      !obj(raw.data) ||
      !Array.isArray(raw.data.list) ||
      raw.data.list.length !== 1 ||
      raw.data.total !== 1
    )
      throw new Error('Diagnostic order status is unavailable');
    const row: unknown = raw.data.list[0];
    if (
      !obj(row) ||
      row.orderId !== orderId ||
      row.orderType !== 'market' ||
      !['PENDING', 'FINISHED', 'FAILED'].includes(String(row.status))
    )
      throw new Error('Diagnostic order identity diverged');
    if (row.txHash === null)
      return {
        providerStatus: row.status,
        transactionHash: null,
        gasMeasurementAvailable: false,
        executionSucceeded: false,
        automaticRetryAllowed: false,
      };
    if (
      typeof row.txHash !== 'string' ||
      !/^0x[a-fA-F0-9]{64}$/.test(row.txHash)
    )
      throw new Error('Diagnostic transaction hash is invalid');
    if (
      row.chain !== '56' ||
      typeof row.fromToken !== 'string' ||
      row.fromToken.toLowerCase() !== instrument.usdt.tokenAddress ||
      typeof row.toToken !== 'string' ||
      row.toToken.toLowerCase() !== instrument.btc.tokenAddress ||
      typeof row.fromTokenQty !== 'string' ||
      !/^(?:1|1\.0+)$/.test(row.fromTokenQty)
    )
      throw new Error('Diagnostic order instrument or amount diverged');
    const transactionHash = row.txHash.toLowerCase();
    const response = await this.http(RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(10000),
      body: JSON.stringify([
        { jsonrpc: '2.0', id: 1, method: 'eth_chainId', params: [] },
        {
          jsonrpc: '2.0',
          id: 2,
          method: 'eth_getTransactionByHash',
          params: [transactionHash],
        },
        {
          jsonrpc: '2.0',
          id: 3,
          method: 'eth_getTransactionReceipt',
          params: [transactionHash],
        },
        {
          jsonrpc: '2.0',
          id: 4,
          method: 'eth_getBlockByNumber',
          params: ['finalized', false],
        },
      ]),
    });
    if (!response.ok) throw new Error('BSC diagnostic receipt is unavailable');
    const body: unknown = await response.json();
    if (
      !Array.isArray(body) ||
      body.length !== 4 ||
      body.some((item) => !obj(item) || item.error)
    )
      throw new Error('Invalid BSC diagnostic response');
    const get = (id: number): unknown => {
      const matches = body.filter((item) => obj(item) && item.id === id);
      if (matches.length !== 1)
        throw new Error('Duplicate or absent RPC identity');
      return (matches[0] as Record<string, unknown>).result;
    };
    if (get(1) !== '0x38')
      throw new Error('Unexpected diagnostic receipt chain');
    const tx = get(2),
      receipt = get(3),
      finalized = get(4);
    if (
      !obj(tx) ||
      !obj(receipt) ||
      !obj(finalized) ||
      tx.hash !== transactionHash ||
      receipt.transactionHash !== transactionHash ||
      typeof tx.from !== 'string' ||
      !/^0x[a-fA-F0-9]{40}$/.test(tx.from) ||
      createHash('sha256').update(tx.from.toLowerCase()).digest('hex') !==
        walletHash
    )
      throw new Error('Receipt does not match the diagnostic wallet');
    for (const value of [
      receipt.gasUsed,
      receipt.effectiveGasPrice,
      receipt.blockNumber,
      finalized.number,
    ])
      if (typeof value !== 'string' || !HEX.test(value))
        throw new Error('Invalid receipt gas or block quantity');
    if (receipt.status !== '0x1' && receipt.status !== '0x0')
      throw new Error('Invalid receipt status');
    if (BigInt(String(receipt.blockNumber)) > BigInt(String(finalized.number)))
      return {
        providerStatus: row.status,
        transactionHash,
        gasMeasurementAvailable: false,
        reason: 'awaiting_finality',
        executionSucceeded: false,
        automaticRetryAllowed: false,
      };
    const gasWei =
      BigInt(String(receipt.gasUsed)) *
      BigInt(String(receipt.effectiveGasPrice));
    return {
      providerStatus: row.status,
      transactionHash,
      receiptSucceeded: receipt.status === '0x1',
      gasUsed: BigInt(String(receipt.gasUsed)).toString(),
      effectiveGasPriceWei: BigInt(
        String(receipt.effectiveGasPrice),
      ).toString(),
      measuredNetworkFeeBnb: new D(gasWei.toString())
        .div('1000000000000000000')
        .toFixed(),
      gasMeasurementAvailable: true,
      measurementScope:
        'this_transaction_only_separate_approval_fees_not_included',
      executionSucceeded: row.status === 'FINISHED' && receipt.status === '0x1',
      automaticRetryAllowed: false,
    };
  }
}

function obj(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
