import { createHash } from 'node:crypto';
import Decimal from 'decimal.js';
import {
  DiagnosticReceipt,
  diagnosticReportFingerprint,
} from './diagnostic-financial-report';
import {
  DiagnosticLedgerGapInput,
  auditDiagnosticLedgerGap,
} from './diagnostic-ledger-gap';
const D = Decimal.clone({ precision: 100, toExpNeg: -100, toExpPos: 100 });
const CONTRACT = '0x60b9262456de011f7d15a54cdd8c48baaa8b022f';
const TRANSFER =
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
export interface RecognizedAgentIdEvidence {
  chainId: '56';
  receipt: DiagnosticReceipt;
  canonicalBlockVerified: boolean;
  finalizedBlockNumber: string;
  operatorConfirmedBinanceRegistration: boolean;
  registeredName: string;
}
function calldataNames(input: string): string[] {
  if (!/^0x8580974c(?:[a-f0-9]{2}){96,2048}$/.test(input))
    throw new Error('Unexpected Agent ID calldata');
  const args = input.slice(10);
  const names: string[] = [];
  for (let i = 0; i < 3; i++) {
    const offset = BigInt('0x' + args.slice(i * 64, i * 64 + 64));
    if (
      offset < 96n ||
      offset % 32n !== 0n ||
      offset * 2n + 64n > BigInt(args.length)
    )
      continue;
    const start = Number(offset) * 2;
    const length = BigInt('0x' + args.slice(start, start + 64));
    if (
      length < 1n ||
      length > 63n ||
      BigInt(start + 64) + length * 2n > BigInt(args.length)
    )
      continue;
    const text = Buffer.from(
      args.slice(start + 64, start + 64 + Number(length) * 2),
      'hex',
    ).toString('utf8');
    if (/^[a-z0-9-]+$/.test(text)) names.push(text);
  }
  return names;
}
/** Classifies a recognized historical expense, never a future registration request. */
export function reconcileRecognizedAgentId(
  input: DiagnosticLedgerGapInput,
  evidence: RecognizedAgentIdEvidence,
) {
  const gap = auditDiagnosticLedgerGap(input);
  const r = evidence.receipt;
  if (
    evidence.chainId !== '56' ||
    evidence.canonicalBlockVerified !== true ||
    evidence.operatorConfirmedBinanceRegistration !== true ||
    typeof evidence.registeredName !== 'string' ||
    !/^[a-z0-9-]{1,63}\.ai$/.test(evidence.registeredName) ||
    !/^[0-9]{1,20}$/.test(evidence.finalizedBlockNumber) ||
    !/^0x[a-f0-9]{64}$/.test(r.hash) ||
    !/^0x[a-f0-9]{64}$/.test(r.blockHash) ||
    !/^0x[a-f0-9]{40}$/.test(r.from) ||
    createHash('sha256').update(r.from).digest('hex') !==
      input.expectedWalletHash ||
    r.to !== CONTRACT ||
    r.valueWei !== '0' ||
    r.succeeded !== true ||
    !/^[0-9]{1,20}$/.test(r.blockNumber) ||
    BigInt(r.blockNumber) > BigInt(evidence.finalizedBlockNumber) ||
    !/^[1-9]\d{0,19}$/.test(r.gasUsed) ||
    !/^[1-9]\d{0,29}$/.test(r.effectiveGasPriceWei) ||
    Object.values(input.diagnostic.transactions).includes(r.hash)
  )
    throw new Error('Invalid recognized Agent ID expense evidence');
  if (!calldataNames(r.input).includes(evidence.registeredName.slice(0, -3)))
    throw new Error('Registered name does not match receipt calldata');
  if (r.logs.length > 512)
    throw new Error('Agent ID receipt log bound exceeded');
  const mints = r.logs.filter(
    (log) =>
      log.address === CONTRACT &&
      log.topics.length === 4 &&
      log.topics[0] === TRANSFER &&
      log.topics[1] === '0x' + '0'.repeat(64) &&
      log.topics[2] === '0x' + r.from.slice(2).padStart(64, '0') &&
      /^0x[a-f0-9]{64}$/.test(log.topics[3]) &&
      log.data === '0x',
  );
  if (mints.length !== 1)
    throw new Error('Exactly one same-wallet identity mint is required');
  const fee = new D(
    (BigInt(r.gasUsed) * BigInt(r.effectiveGasPriceWei)).toString(),
  ).div('1000000000000000000');
  const assets = gap.assets.map((row) => ({
    ...row,
    identityRegistrationDelta:
      row.asset === 'BNB' ? fee.negated().toFixed() : '0',
    remainingUnexplainedDelta:
      row.asset === 'BNB'
        ? new D(row.unexplainedDelta).plus(fee).toFixed()
        : row.unexplainedDelta,
  }));
  const facts = {
    scope: 'recognized_agent_id_reconciliation' as const,
    status: assets.every((row) => row.remainingUnexplainedDelta === '0')
      ? ('scoped_quantities_match' as const)
      : ('residual_change' as const),
    initializationId: gap.initializationId,
    diagnosticFingerprint: gap.diagnosticFingerprint,
    registeredName: evidence.registeredName,
    identityTransactionHash: r.hash,
    identityContract: CONTRACT,
    identityTokenId: BigInt(mints[0].topics[3]).toString(),
    receiptBlockHash: r.blockHash,
    receiptBlockNumber: r.blockNumber,
    operatorRecognitionVerified: true as const,
    expenseCategory: 'wallet_identity_registration' as const,
    identityGasBnb: fee.toFixed(),
    diagnosticGasBnb: input.diagnostic.gas.totalBnb,
    totalKnownGasBnb: new D(input.diagnostic.gas.totalBnb).plus(fee).toFixed(),
    assets,
    nftMarketValue: null,
    fullHistoryReconciled: false as const,
    realizedTradingPnlAvailable: false as const,
    accountingMutated: false as const,
    submissionAuthorized: false as const,
  };
  return {
    ...facts,
    fingerprint: diagnosticReportFingerprint(facts),
    observedAt: input.observedAt.toISOString(),
  };
}
