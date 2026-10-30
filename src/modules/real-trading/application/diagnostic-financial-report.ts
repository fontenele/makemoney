import { createHash } from 'node:crypto';
import Decimal from 'decimal.js';
import { GasDiagnosticPlan } from './gas-diagnostic-store';
import { APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT as instrument } from './real-execution-instrument-approval';

const D = Decimal.clone({ precision: 100, toExpNeg: -100, toExpPos: 100 });
const HASH = /^0x[a-f0-9]{64}$/;
const ADDRESS = /^0x[a-f0-9]{40}$/;
const UINT = /^(?:0|[1-9]\d{0,77})$/;
const TRANSFER =
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

export interface DiagnosticReceipt {
  hash: string;
  from: string;
  to: string;
  input: string;
  nonce: string;
  valueWei: string;
  blockNumber: string;
  blockHash: string;
  gasUsed: string;
  effectiveGasPriceWei: string;
  succeeded: boolean;
  logs: readonly { address: string; topics: readonly string[]; data: string }[];
}

export interface DiagnosticReceiptBundle {
  chainId: '56';
  swap: DiagnosticReceipt;
  approval: DiagnosticReceipt;
  revocation: DiagnosticReceipt;
  finalizedBlockNumber: string;
  usdtDecimals: number;
  btcbDecimals: number;
  currentAllowanceRaw: string;
  observedAt: Date;
}

export interface DiagnosticReceiptRequest {
  swapHash: string;
  approvalHash: string;
  revocationHash: string;
  walletHash: string;
}
export interface DiagnosticReceiptsReader {
  load(request: DiagnosticReceiptRequest): Promise<DiagnosticReceiptBundle>;
}

export function buildDiagnosticFinancialReport(
  plan: GasDiagnosticPlan,
  bundle: DiagnosticReceiptBundle,
) {
  if (
    bundle.chainId !== '56' ||
    !UINT.test(bundle.finalizedBlockNumber) ||
    !UINT.test(bundle.currentAllowanceRaw) ||
    !(bundle.observedAt instanceof Date) ||
    !Number.isFinite(bundle.observedAt.getTime())
  )
    throw new Error('Invalid diagnostic receipt bundle');
  if (bundle.usdtDecimals !== 18 || bundle.btcbDecimals !== 18)
    throw new Error('Unexpected approved-token precision');
  const receipts = [bundle.swap, bundle.approval, bundle.revocation];
  if (new Set(receipts.map((row) => row.hash)).size !== 3)
    throw new Error('Diagnostic transactions must be distinct');
  for (const row of receipts) {
    if (
      !/^\d{1,20}$/.test(row.gasUsed) ||
      !/^\d{1,30}$/.test(row.effectiveGasPriceWei) ||
      row.gasUsed === '0'
    )
      throw new Error('Diagnostic gas facts exceed supported precision');
    if (
      !HASH.test(row.hash) ||
      !HASH.test(row.blockHash) ||
      !ADDRESS.test(row.from) ||
      !ADDRESS.test(row.to) ||
      !/^0x(?:[a-f0-9]{2})*$/.test(row.input) ||
      !row.succeeded ||
      ![
        row.valueWei,
        row.nonce,
        row.blockNumber,
        row.gasUsed,
        row.effectiveGasPriceWei,
      ].every((value) => typeof value === 'string' && UINT.test(value)) ||
      row.valueWei !== '0' ||
      BigInt(row.blockNumber) > BigInt(bundle.finalizedBlockNumber)
    )
      throw new Error('Invalid, failed or unfinalized diagnostic transaction');
    if (createHash('sha256').update(row.from).digest('hex') !== plan.walletHash)
      throw new Error('Diagnostic sender differs from the reserved wallet');
  }
  if (
    BigInt(bundle.approval.blockNumber) > BigInt(bundle.swap.blockNumber) ||
    BigInt(bundle.revocation.blockNumber) < BigInt(bundle.swap.blockNumber)
  )
    throw new Error('Diagnostic transaction chronology diverged');
  const approval = decodeApproval(bundle.approval);
  const revocation = decodeApproval(bundle.revocation);
  if (
    BigInt(bundle.approval.nonce) + 1n !== BigInt(bundle.swap.nonce) ||
    BigInt(bundle.revocation.nonce) <= BigInt(bundle.swap.nonce) ||
    approval.spender !== bundle.swap.to ||
    BigInt(approval.amount) < 1000000000000000000n
  )
    throw new Error(
      'Approval is not the immediately preceding swap authorization',
    );
  if (approval.spender !== revocation.spender || revocation.amount !== '0')
    throw new Error('Revocation does not clear the same approval');
  const usdtDelta = tokenDelta(bundle.swap, instrument.usdt.tokenAddress);
  const btcbDelta = tokenDelta(bundle.swap, instrument.btc.tokenAddress);
  if (usdtDelta !== -1000000000000000000n || btcbDelta <= 0n)
    throw new Error(
      'Diagnostic token flows do not match the fixed one-USDT buy',
    );
  for (const row of [bundle.approval, bundle.revocation])
    if (
      tokenDelta(row, instrument.usdt.tokenAddress) !== 0n ||
      tokenDelta(row, instrument.btc.tokenAddress) !== 0n
    )
      throw new Error(
        'Approval maintenance unexpectedly transfers approved tokens',
      );
  if (
    !/^(?:[1-9]\d{0,19}|0)(?:\.\d{1,18})?$/.test(plan.referenceBnbUsdt) ||
    !new D(plan.referenceBnbUsdt).gt(0)
  )
    throw new Error('Invalid reference valuation');
  const swapFee = fee(bundle.swap),
    approvalFee = fee(bundle.approval),
    revocationFee = fee(bundle.revocation);
  const entryFee = swapFee + approvalFee;
  const totalFee = entryFee + revocationFee;
  const bnb = (wei: bigint) =>
    new D(wei.toString()).div('1000000000000000000').toFixed();
  const usdt = (wei: bigint) =>
    new D(bnb(wei))
      .times(plan.referenceBnbUsdt)
      .toDecimalPlaces(18, Decimal.ROUND_UP)
      .toFixed();
  const report = {
    version: 'diagnostic_financial_report_v1' as const,
    planId: plan.id,
    planFingerprint: plan.fingerprint,
    chainId: '56' as const,
    transactions: {
      swap: bundle.swap.hash,
      approval: bundle.approval.hash,
      revocation: bundle.revocation.hash,
    },
    receiptEvidence: receipts.map((row) => ({
      hash: row.hash,
      blockHash: row.blockHash,
      blockNumber: row.blockNumber,
      nonce: row.nonce,
      gasUsed: row.gasUsed,
      effectiveGasPriceWei: row.effectiveGasPriceWei,
    })),
    sourceSpentUsdt: '1',
    receivedBtcb: new D(btcbDelta.toString())
      .div('1000000000000000000')
      .toFixed(),
    gas: {
      swapBnb: bnb(swapFee),
      approvalBnb: bnb(approvalFee),
      entryBnb: bnb(entryFee),
      revocationBnb: bnb(revocationFee),
      totalBnb: bnb(totalFee),
    },
    indicativeEntryGasUsdt: usdt(entryFee),
    indicativeTotalGasUsdt: usdt(totalFee),
    indicativeEntryGasPercentage: new D(usdt(entryFee)).times(100).toFixed(),
    indicativeEntryCostUsdt: new D(1).plus(usdt(entryFee)).toFixed(),
    indicativeExperimentCostUsdt: new D(1).plus(usdt(totalFee)).toFixed(),
    assetDeltas: {
      USDT: '-1',
      BTCB: new D(btcbDelta.toString()).div('1000000000000000000').toFixed(),
      BNB: new D(bnb(totalFee)).negated().toFixed(),
    },
    referenceBnbUsdt: plan.referenceBnbUsdt,
    conversionBasis:
      'preparation_price_not_historical_execution_price' as const,
    approval: {
      spender: approval.spender,
      originalAmountRaw: approval.amount,
      grantExceededTradeInput: BigInt(approval.amount) > 1000000000000000000n,
      remainingAmountRaw: bundle.currentAllowanceRaw,
      observationBasis: 'latest_public_call_not_finalized_state' as const,
      clearedAtObservation: bundle.currentAllowanceRaw === '0',
    },
    sampleCount: 1,
    sellGasMeasured: false,
    futureGasCostGuaranteed: false,
    realizedTradingPnlAvailable: false,
    globalAccountingMutated: false,
    unrelatedTransactionsIncluded: false,
    submissionAuthorized: false,
  };
  return {
    ...report,
    fingerprint: diagnosticReportFingerprint(report),
    observedAt: bundle.observedAt.toISOString(),
  };
}

export type DiagnosticFinancialReport = ReturnType<
  typeof buildDiagnosticFinancialReport
>;
export function diagnosticReportFingerprint(value: unknown): string {
  if (value === null || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Invalid diagnostic report facts');
  const facts = Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(
      ([key]) => key !== 'fingerprint' && key !== 'observedAt',
    ),
  );
  const canonical = (item: unknown): unknown =>
    Array.isArray(item)
      ? item.map(canonical)
      : item !== null && typeof item === 'object'
        ? Object.fromEntries(
            Object.entries(item as Record<string, unknown>)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([key, nested]) => [key, canonical(nested)]),
          )
        : item;
  return createHash('sha256')
    .update(JSON.stringify(canonical(facts)))
    .digest('hex');
}

function decodeApproval(row: DiagnosticReceipt) {
  if (
    row.to !== instrument.usdt.tokenAddress ||
    !/^0x095ea7b3[0-9a-f]{128}$/.test(row.input)
  )
    throw new Error('Unexpected approval call');
  if (!/^0{24}$/.test(row.input.slice(10, 34)))
    throw new Error('Non-canonical approval spender encoding');
  return {
    spender: '0x' + row.input.slice(34, 74),
    amount: BigInt('0x' + row.input.slice(74)).toString(),
  };
}
function fee(row: DiagnosticReceipt) {
  return BigInt(row.gasUsed) * BigInt(row.effectiveGasPriceWei);
}
function tokenDelta(row: DiagnosticReceipt, token: string) {
  let total = 0n;
  if (row.logs.length > 512)
    throw new Error('Diagnostic logs exceed their bound');
  for (const log of row.logs) {
    if (log.address !== token || log.topics[0] !== TRANSFER) continue;
    if (
      log.topics.length !== 3 ||
      !log.topics.every((value) => HASH.test(value)) ||
      !/^0x0{24}[a-f0-9]{40}$/.test(log.topics[1]) ||
      !/^0x0{24}[a-f0-9]{40}$/.test(log.topics[2]) ||
      !/^0x[a-f0-9]{64}$/.test(log.data)
    )
      throw new Error('Invalid ERC20 transfer event');
    const amount = BigInt(log.data);
    if ('0x' + log.topics[2].slice(-40) === row.from) total += amount;
    if ('0x' + log.topics[1].slice(-40) === row.from) total -= amount;
  }
  return total;
}
