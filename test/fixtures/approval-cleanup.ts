import { diagnosticBundle, diagnosticPlan } from './diagnostic-report';
import {
  ApprovalCleanupPlan,
  ApprovalCleanupReceiptEvidence,
  ApprovalCleanupRecord,
  newApprovalCleanup,
  transitionApprovalCleanup,
} from '../../src/modules/real-trading/application/approval-cleanup';
export const cleanupNow = new Date('2026-10-30T18:00:00.000Z');
export function cleanupPlan(): ApprovalCleanupPlan {
  return {
    id: '00000000-0000-4000-8000-000000000601',
    operationId: '00000000-0000-4000-8000-000000000602',
    walletHash: diagnosticPlan().walletHash,
    chainId: '56',
    token: '0x55d398326f99059ff775485246999027b3197955',
    spender: '0xb300000b72deaeb607a12d5f54773d1c19c7028d',
  };
}
export function cleanupReceipt(): ApprovalCleanupReceiptEvidence {
  const receipt = diagnosticBundle().revocation;
  receipt.input =
    '0x095ea7b3' +
    cleanupPlan().spender.slice(2).padStart(64, '0') +
    '0'.repeat(64);
  return {
    chainId: '56',
    receipt,
    canonicalBlockVerified: true,
    finalizedBlockNumber: '110',
    allowanceRaw: '0',
    observedAt: new Date(cleanupNow),
  };
}
export function cleanupSubmitted(): ApprovalCleanupRecord {
  let r = newApprovalCleanup(cleanupPlan());
  r = transitionApprovalCleanup(
    r,
    {
      type: 'operation_terminal',
      operationId: r.plan.operationId,
      providerOrderId: 'order123',
    },
    cleanupNow,
  );
  r = transitionApprovalCleanup(r, { type: 'claim' }, cleanupNow);
  return transitionApprovalCleanup(
    r,
    { type: 'broadcast', transactionHash: cleanupReceipt().receipt.hash },
    cleanupNow,
  );
}
