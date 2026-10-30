import { createHash } from 'node:crypto';
import { DiagnosticReceipt } from './diagnostic-financial-report';
import { APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT as instrument } from './real-execution-instrument-approval';

const UUID =
  /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const HASH = /^0x[a-f0-9]{64}$/;
const DIGEST = /^[a-f0-9]{64}$/;
const ROUTER = '0xb300000b72deaeb607a12d5f54773d1c19c7028d';
export interface ApprovalCleanupPlan {
  id: string;
  operationId: string;
  walletHash: string;
  chainId: '56';
  token: string;
  spender: string;
}
export type ApprovalCleanupState =
  | 'awaiting_operation'
  | 'ready'
  | 'claimed'
  | 'submitted'
  | 'unknown'
  | 'failed'
  | 'cleared';
export interface ApprovalCleanupRecord {
  plan: ApprovalCleanupPlan;
  fingerprint: string;
  state: ApprovalCleanupState;
  operationOrderId: string | null;
  transactionHash: string | null;
  measuredGasWei: string | null;
  lastObservation: {
    observedAt: string;
    blockHash: string;
    blockNumber: string;
    finalizedBlockNumber: string;
    allowanceRaw: string;
    receiptSucceeded: boolean;
  } | null;
}
/** Trusted internal read boundary; no HTTP caller can supply this evidence. */
export interface ApprovalCleanupReceiptEvidence {
  chainId: '56';
  receipt: DiagnosticReceipt;
  canonicalBlockVerified: boolean;
  finalizedBlockNumber: string;
  allowanceRaw: string;
  observedAt: Date;
}
export type ApprovalCleanupEvent =
  | { type: 'operation_terminal'; operationId: string; providerOrderId: string }
  | { type: 'claim' }
  | { type: 'broadcast'; transactionHash: string }
  | { type: 'ambiguous' }
  | { type: 'receipt'; evidence: ApprovalCleanupReceiptEvidence };
export function approvalCleanupPlanFingerprint(
  plan: ApprovalCleanupPlan,
): string {
  if (
    !plan ||
    Object.keys(plan).sort().join(',') !==
      'chainId,id,operationId,spender,token,walletHash' ||
    !UUID.test(plan.id) ||
    !UUID.test(plan.operationId) ||
    !DIGEST.test(plan.walletHash) ||
    plan.chainId !== '56' ||
    ![instrument.usdt.tokenAddress, instrument.btc.tokenAddress].some(
      (token) => token === plan.token,
    ) ||
    plan.spender !== ROUTER
  )
    throw new Error('Invalid approval-cleanup scope');
  return createHash('sha256')
    .update(
      JSON.stringify([
        plan.id,
        plan.operationId,
        plan.walletHash,
        plan.chainId,
        plan.token,
        plan.spender,
      ]),
    )
    .digest('hex');
}
export function newApprovalCleanup(
  plan: ApprovalCleanupPlan,
): ApprovalCleanupRecord {
  return {
    plan: { ...plan },
    fingerprint: approvalCleanupPlanFingerprint(plan),
    state: 'awaiting_operation',
    operationOrderId: null,
    transactionHash: null,
    measuredGasWei: null,
    lastObservation: null,
  };
}
/** No retry transition exists. A claimed record remains consumed across crashes. */
export function transitionApprovalCleanup(
  record: ApprovalCleanupRecord,
  event: ApprovalCleanupEvent,
  now: Date,
): ApprovalCleanupRecord {
  if (
    approvalCleanupPlanFingerprint(record.plan) !== record.fingerprint ||
    !Number.isFinite(now.getTime())
  )
    throw new Error('Invalid approval-cleanup record');
  const next = structuredClone(record);
  if (
    event.type === 'operation_terminal' &&
    record.state === 'awaiting_operation'
  ) {
    if (
      event.operationId !== record.plan.operationId ||
      typeof event.providerOrderId !== 'string' ||
      !/^[A-Za-z0-9_-]{1,256}$/.test(event.providerOrderId)
    )
      throw new Error('Cleanup operation correlation diverged');
    next.operationOrderId = event.providerOrderId;
    next.state = 'ready';
  } else if (event.type === 'claim' && record.state === 'ready')
    next.state = 'claimed';
  else if (event.type === 'broadcast' && record.state === 'claimed') {
    if (!HASH.test(event.transactionHash))
      throw new Error('Invalid revocation transaction hash');
    next.transactionHash = event.transactionHash;
    next.state = 'submitted';
  } else if (event.type === 'ambiguous' && record.state === 'claimed')
    next.state = 'unknown';
  else if (event.type === 'receipt' && record.state === 'submitted') {
    const e = event.evidence,
      r = e.receipt;
    const uint = (v: unknown): v is string =>
      typeof v === 'string' && /^(?:0|[1-9]\d{0,77})$/.test(v);
    if (
      e.chainId !== '56' ||
      e.canonicalBlockVerified !== true ||
      !(e.observedAt instanceof Date) ||
      !Number.isFinite(e.observedAt.getTime()) ||
      e.observedAt > now ||
      now.getTime() - e.observedAt.getTime() > 5000 ||
      !uint(e.finalizedBlockNumber) ||
      !uint(e.allowanceRaw) ||
      !uint(r.blockNumber) ||
      !HASH.test(r.blockHash) ||
      r.hash !== record.transactionHash ||
      !/^0x[a-f0-9]{40}$/.test(r.from) ||
      createHash('sha256').update(r.from).digest('hex') !==
        record.plan.walletHash ||
      r.to !== record.plan.token ||
      r.valueWei !== '0' ||
      r.input !==
        '0x095ea7b3' +
          record.plan.spender.slice(2).padStart(64, '0') +
          '0'.repeat(64) ||
      BigInt(r.blockNumber) > BigInt(e.finalizedBlockNumber) ||
      !/^[1-9]\d{0,19}$/.test(r.gasUsed) ||
      !/^(?:0|[1-9]\d{0,29})$/.test(r.effectiveGasPriceWei) ||
      typeof r.succeeded !== 'boolean'
    )
      throw new Error('Invalid or unfinalized approval-cleanup evidence');
    next.measuredGasWei = (
      BigInt(r.gasUsed) * BigInt(r.effectiveGasPriceWei)
    ).toString();
    next.lastObservation = {
      observedAt: e.observedAt.toISOString(),
      blockHash: r.blockHash,
      blockNumber: r.blockNumber,
      finalizedBlockNumber: e.finalizedBlockNumber,
      allowanceRaw: e.allowanceRaw,
      receiptSucceeded: r.succeeded,
    };
    next.state = r.succeeded && e.allowanceRaw === '0' ? 'cleared' : 'failed';
  } else
    throw new Error('Approval-cleanup transition blocked; no automatic retry');
  return next;
}
