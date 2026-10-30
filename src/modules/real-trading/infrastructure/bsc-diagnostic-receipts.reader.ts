import { createHash } from 'node:crypto';
import {
  DiagnosticReceipt,
  DiagnosticReceiptBundle,
  DiagnosticReceiptRequest,
  DiagnosticReceiptsReader,
} from '../application/diagnostic-financial-report';
import { APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT as instrument } from '../application/real-execution-instrument-approval';

const RPC = 'https://bsc-dataseed.bnbchain.org';
const HASH = /^0x[a-f0-9]{64}$/;
const HEX = /^0x(?:0|[1-9a-f][a-f0-9]{0,63})$/;
const ADDRESS = /^0x[a-f0-9]{40}$/;
type RpcRequest = { id: number; method: string; params: unknown[] };

/** Fixed-chain, public reads only. Never signs or broadcasts. */
export class BscDiagnosticReceiptsReader implements DiagnosticReceiptsReader {
  constructor(
    private readonly http: typeof fetch = fetch,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async load(
    input: DiagnosticReceiptRequest,
  ): Promise<DiagnosticReceiptBundle> {
    const request = { ...input };
    if (
      ![request.swapHash, request.approvalHash, request.revocationHash].every(
        (hash) => HASH.test(hash),
      ) ||
      !/^[a-f0-9]{64}$/.test(request.walletHash)
    )
      throw new Error('Invalid diagnostic receipt request');
    const batch = await this.rpc([
      { id: 1, method: 'eth_chainId', params: [] },
      { id: 2, method: 'eth_getBlockByNumber', params: ['finalized', false] },
      { id: 3, method: 'eth_getTransactionByHash', params: [request.swapHash] },
      {
        id: 4,
        method: 'eth_getTransactionReceipt',
        params: [request.swapHash],
      },
      {
        id: 5,
        method: 'eth_getTransactionByHash',
        params: [request.approvalHash],
      },
      {
        id: 6,
        method: 'eth_getTransactionReceipt',
        params: [request.approvalHash],
      },
      {
        id: 7,
        method: 'eth_getTransactionByHash',
        params: [request.revocationHash],
      },
      {
        id: 8,
        method: 'eth_getTransactionReceipt',
        params: [request.revocationHash],
      },
      {
        id: 9,
        method: 'eth_call',
        params: [
          { to: instrument.usdt.tokenAddress, data: '0x313ce567' },
          'latest',
        ],
      },
      {
        id: 10,
        method: 'eth_call',
        params: [
          { to: instrument.btc.tokenAddress, data: '0x313ce567' },
          'latest',
        ],
      },
    ]);
    if (batch(1) !== '0x38') throw new Error('Unexpected diagnostic chain');
    const finalized = object(batch(2));
    const finalizedBlockNumber = quantity(finalized.number);
    const swap = parseBscDiagnosticReceipt(
      batch(3),
      batch(4),
      request.swapHash,
    );
    const approval = parseBscDiagnosticReceipt(
      batch(5),
      batch(6),
      request.approvalHash,
    );
    const revocation = parseBscDiagnosticReceipt(
      batch(7),
      batch(8),
      request.revocationHash,
    );
    if (
      createHash('sha256').update(swap.from).digest('hex') !==
        request.walletHash ||
      !/^0x095ea7b3[0-9a-f]{128}$/.test(approval.input)
    )
      throw new Error('Diagnostic wallet or approval identity diverged');
    const spender = '0x' + approval.input.slice(34, 74);
    const allowanceData =
      '0xdd62ed3e' +
      swap.from.slice(2).padStart(64, '0') +
      spender.slice(2).padStart(64, '0');
    const verification = await this.rpc([
      {
        id: 1,
        method: 'eth_call',
        params: [
          { to: instrument.usdt.tokenAddress, data: allowanceData },
          'latest',
        ],
      },
      ...[swap, approval, revocation].map((row, index) => ({
        id: index + 2,
        method: 'eth_getBlockByNumber',
        params: ['0x' + BigInt(row.blockNumber).toString(16), false],
      })),
    ]);
    for (const [index, row] of [swap, approval, revocation].entries())
      if (object(verification(index + 2)).hash !== row.blockHash)
        throw new Error('Receipt block is not canonical');
    const usdtDecimals = wordQuantity(batch(9)),
      btcbDecimals = wordQuantity(batch(10));
    if (usdtDecimals !== '18' || btcbDecimals !== '18')
      throw new Error('Unexpected approved-token decimals');
    return {
      chainId: '56',
      swap,
      approval,
      revocation,
      finalizedBlockNumber,
      usdtDecimals: 18,
      btcbDecimals: 18,
      currentAllowanceRaw: wordQuantity(verification(1)),
      observedAt: this.now(),
    };
  }

  private async rpc(requests: RpcRequest[]) {
    const response = await this.http(RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify(requests.map((row) => ({ jsonrpc: '2.0', ...row }))),
    });
    if (!response.ok) throw new Error('Diagnostic receipt RPC unavailable');
    const text = await response.text();
    if (text.length > 1000000)
      throw new Error('Diagnostic receipt response exceeded its bound');
    const value: unknown = JSON.parse(text);
    if (!Array.isArray(value) || value.length !== requests.length)
      throw new Error('Invalid diagnostic RPC batch');
    const results = new Map<number, unknown>();
    for (const entry of value) {
      const row = object(entry);
      if (
        row.error ||
        typeof row.id !== 'number' ||
        !requests.some((request) => request.id === row.id) ||
        results.has(row.id) ||
        !('result' in row)
      )
        throw new Error('Invalid diagnostic RPC identity');
      results.set(row.id, row.result);
    }
    return (id: number): unknown => {
      if (!results.has(id)) throw new Error('Missing diagnostic RPC result');
      return results.get(id);
    };
  }
}

export function parseBscDiagnosticReceipt(
  transaction: unknown,
  result: unknown,
  hash: string,
): DiagnosticReceipt {
  const tx = object(transaction),
    row = object(result);
  if (
    tx.hash !== hash ||
    row.transactionHash !== hash ||
    tx.blockHash !== row.blockHash ||
    typeof row.blockHash !== 'string' ||
    !HASH.test(row.blockHash) ||
    tx.blockNumber !== row.blockNumber ||
    (row.status !== '0x1' && row.status !== '0x0') ||
    !Array.isArray(row.logs) ||
    row.logs.length > 512 ||
    typeof tx.input !== 'string' ||
    !/^0x(?:[0-9a-fA-F]{2})*$/.test(tx.input)
  )
    throw new Error('Invalid diagnostic transaction or receipt');
  return {
    hash,
    from: address(tx.from),
    to: address(tx.to),
    input: tx.input.toLowerCase(),
    nonce: quantity(tx.nonce),
    valueWei: quantity(tx.value),
    blockNumber: quantity(row.blockNumber),
    blockHash: row.blockHash,
    gasUsed: quantity(row.gasUsed),
    effectiveGasPriceWei: quantity(row.effectiveGasPrice),
    succeeded: row.status === '0x1',
    logs: row.logs.map((item) => {
      const log = object(item);
      if (
        !Array.isArray(log.topics) ||
        log.topics.length > 4 ||
        !log.topics.every(
          (topic) =>
            typeof topic === 'string' && /^0x[0-9a-fA-F]{64}$/.test(topic),
        ) ||
        typeof log.data !== 'string' ||
        !/^0x(?:[0-9a-fA-F]{2})*$/.test(log.data) ||
        log.data.length > 65538
      )
        throw new Error('Invalid diagnostic receipt log');
      return {
        address: address(log.address),
        topics: (log.topics as string[]).map((topic) => topic.toLowerCase()),
        data: log.data.toLowerCase(),
      };
    }),
  };
}
function object(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    throw new Error('Invalid diagnostic RPC object');
  return value as Record<string, unknown>;
}
function address(value: unknown) {
  if (typeof value !== 'string' || !ADDRESS.test(value.toLowerCase()))
    throw new Error('Invalid diagnostic address');
  return value.toLowerCase();
}
function quantity(value: unknown) {
  if (typeof value !== 'string' || !HEX.test(value.toLowerCase()))
    throw new Error('Invalid diagnostic integer quantity');
  return BigInt(value).toString();
}

function wordQuantity(value: unknown) {
  if (typeof value !== 'string' || !/^0x[0-9a-fA-F]{64}$/.test(value))
    throw new Error('Invalid diagnostic ABI integer');
  return BigInt(value).toString();
}
