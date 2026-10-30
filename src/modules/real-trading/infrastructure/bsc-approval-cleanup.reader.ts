import {
  ApprovalCleanupRecord,
  ApprovalCleanupReceiptEvidence,
  approvalCleanupPlanFingerprint,
  transitionApprovalCleanup,
} from '../application/approval-cleanup';
import { ApprovalCleanupReceiptReader } from '../application/approval-cleanup-monitor';
import { parseBscDiagnosticReceipt } from './bsc-diagnostic-receipts.reader';
const RPC = 'https://bsc-dataseed.bnbchain.org';
type Request = { id: number; method: string; params: unknown[] };
export class BscApprovalCleanupReader implements ApprovalCleanupReceiptReader {
  constructor(
    private readonly http: typeof fetch = fetch,
    private readonly now: () => Date = () => new Date(),
  ) {}
  async load(
    input: ApprovalCleanupRecord,
  ): Promise<ApprovalCleanupReceiptEvidence> {
    const record = structuredClone(input);
    if (
      record.state !== 'submitted' ||
      approvalCleanupPlanFingerprint(record.plan) !== record.fingerprint ||
      typeof record.transactionHash !== 'string' ||
      !/^0x[a-f0-9]{64}$/.test(record.transactionHash)
    )
      throw new Error('Submitted cleanup with known hash required');
    const first = await this.rpc([
      { id: 1, method: 'eth_chainId', params: [] },
      {
        id: 2,
        method: 'eth_getTransactionByHash',
        params: [record.transactionHash],
      },
      {
        id: 3,
        method: 'eth_getTransactionReceipt',
        params: [record.transactionHash],
      },
      { id: 4, method: 'eth_getBlockByNumber', params: ['finalized', false] },
    ]);
    if (first(1) !== '0x38') throw new Error('Unexpected cleanup chain');
    const receipt = parseBscDiagnosticReceipt(
      first(2),
      first(3),
      record.transactionHash,
    );
    const finalized = object(first(4));
    if (
      typeof finalized.number !== 'string' ||
      !/^0x(?:0|[1-9a-f][a-f0-9]{0,63})$/.test(finalized.number)
    )
      throw new Error('Invalid finalized block');
    const second = await this.rpc([
      {
        id: 1,
        method: 'eth_getBlockByNumber',
        params: ['0x' + BigInt(receipt.blockNumber).toString(16), false],
      },
      {
        id: 2,
        method: 'eth_call',
        params: [
          {
            to: record.plan.token,
            data:
              '0xdd62ed3e' +
              receipt.from.slice(2).padStart(64, '0') +
              record.plan.spender.slice(2).padStart(64, '0'),
          },
          'latest',
        ],
      },
    ]);
    const allowance = second(2);
    if (
      object(second(1)).hash !== receipt.blockHash ||
      typeof allowance !== 'string' ||
      !/^0x[a-fA-F0-9]{64}$/.test(allowance)
    )
      throw new Error('Invalid canonical receipt or allowance');
    const now = this.now();
    const evidence: ApprovalCleanupReceiptEvidence = {
      chainId: '56',
      receipt,
      canonicalBlockVerified: true,
      finalizedBlockNumber: BigInt(finalized.number).toString(),
      allowanceRaw: BigInt(allowance).toString(),
      observedAt: now,
    };
    transitionApprovalCleanup(record, { type: 'receipt', evidence }, now);
    return evidence;
  }
  private async rpc(requests: Request[]) {
    const response = await this.http(RPC, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify(requests.map((row) => ({ jsonrpc: '2.0', ...row }))),
    });
    if (!response.ok) throw new Error('Cleanup RPC unavailable');
    const text = await response.text();
    if (text.length > 1000000)
      throw new Error('Cleanup RPC response too large');
    const data: unknown = JSON.parse(text);
    if (!Array.isArray(data) || data.length !== requests.length)
      throw new Error('Invalid cleanup RPC response');
    const results = new Map<number, unknown>();
    for (const item of data) {
      const r = object(item);
      if (
        r.error ||
        typeof r.id !== 'number' ||
        !requests.some((request) => request.id === r.id) ||
        results.has(r.id) ||
        !('result' in r)
      )
        throw new Error('Cleanup RPC correlation failed');
      results.set(r.id, r.result);
    }
    return (id: number): unknown => results.get(id);
  }
}
function object(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    throw new Error('Invalid cleanup RPC object');
  return value as Record<string, unknown>;
}
