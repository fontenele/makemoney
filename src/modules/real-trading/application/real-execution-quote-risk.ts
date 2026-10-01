import Decimal from 'decimal.js';

import {
  RealExecutionAsset,
  RealExecutionIntent,
  RealExecutionQuote,
  validateRealExecutionIntent,
  validateRealExecutionQuote,
} from '../domain/real-execution';
import { APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT } from './real-execution-instrument-approval';
import {
  assessRealExecutionLocalRiskLimits,
  RealExecutionLocalRiskLimits,
} from './real-execution-local-risk-limits';

const ExactDecimal = Decimal.clone({
  precision: 40,
  rounding: Decimal.ROUND_HALF_EVEN,
  toExpNeg: -40,
  toExpPos: 40,
});

export type RealExecutionQuoteRiskBlocker =
  | 'invalid_intent'
  | 'invalid_quote'
  | 'quote_intent_mismatch'
  | 'provider_not_approved'
  | 'instrument_not_approved'
  | 'quote_from_future'
  | 'quote_expired'
  | 'local_limits_blocked'
  | 'order_notional_exceeds_limit'
  | 'slippage_exceeds_limit'
  | 'cost_coverage_incomplete'
  | 'provider_fee_missing'
  | 'provider_fee_not_source_asset'
  | 'provider_fee_rate_exceeds_limit'
  | 'network_fee_missing'
  | 'network_fee_not_usdt'
  | 'network_fee_exceeds_limit';

export interface RealExecutionQuoteRiskAssessment {
  readonly scope: 'real_execution_quote_risk';
  readonly status: 'within_quote_limits' | 'blocked';
  readonly blockers: readonly RealExecutionQuoteRiskBlocker[];
  readonly orderNotionalUsdt: string | null;
  readonly providerFeeRate: string | null;
  readonly networkFeeUsdt: string | null;
  readonly dailySpendEvaluated: false;
  readonly bankrollEvaluated: false;
  readonly riskApproved: false;
  readonly fundingAuthorized: false;
  readonly quoteAuthorized: false;
  readonly submissionAuthorized: false;
  readonly evaluatedAt: Date;
}

export function assessRealExecutionQuoteRisk(
  intent: RealExecutionIntent,
  quote: RealExecutionQuote,
  limits: RealExecutionLocalRiskLimits,
  evaluatedAt: Date,
): RealExecutionQuoteRiskAssessment {
  validateEvaluationTime(evaluatedAt);
  const blockers: RealExecutionQuoteRiskBlocker[] = [];
  const intentValid = isValidIntent(intent);
  const quoteValid = isValidQuote(quote);
  addIf(blockers, !intentValid, 'invalid_intent');
  addIf(blockers, !quoteValid, 'invalid_quote');

  const limitAssessment = assessRealExecutionLocalRiskLimits(limits);
  addIf(blockers, limitAssessment.status !== 'defined', 'local_limits_blocked');

  if (intentValid && quoteValid) {
    addIf(blockers, !sameIntent(intent, quote.intent), 'quote_intent_mismatch');
    addIf(
      blockers,
      quote.providerId !==
        APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT.providerId,
      'provider_not_approved',
    );
    addIf(blockers, !approvedDirection(intent), 'instrument_not_approved');
    addIf(
      blockers,
      quote.quotedAt.getTime() > evaluatedAt.getTime(),
      'quote_from_future',
    );
    addIf(
      blockers,
      quote.expiresAt.getTime() <= evaluatedAt.getTime(),
      'quote_expired',
    );
    addIf(
      blockers,
      quote.costCoverage !== 'complete',
      'cost_coverage_incomplete',
    );
  }

  const orderNotionalUsdt =
    intentValid && quoteValid ? deriveOrderNotionalUsdt(intent, quote) : null;
  const providerFeeRate =
    intentValid && quoteValid
      ? deriveProviderFeeRate(intent, quote, blockers)
      : null;
  const networkFeeUsdt = quoteValid
    ? deriveNetworkFeeUsdt(quote, blockers)
    : null;

  if (limitAssessment.status === 'defined' && intentValid && quoteValid) {
    if (orderNotionalUsdt === null) {
      addIf(blockers, true, 'instrument_not_approved');
    } else {
      addIf(
        blockers,
        new ExactDecimal(orderNotionalUsdt).greaterThan(
          limits.maximumOrderNotionalUsdt!,
        ),
        'order_notional_exceeds_limit',
      );
    }
    addIf(
      blockers,
      new ExactDecimal(intent.maxSlippageRate).greaterThan(
        limits.maximumSlippageRate!,
      ),
      'slippage_exceeds_limit',
    );
    if (providerFeeRate !== null) {
      addIf(
        blockers,
        new ExactDecimal(providerFeeRate).greaterThan(
          limits.maximumProviderFeeRate!,
        ),
        'provider_fee_rate_exceeds_limit',
      );
    }
    if (networkFeeUsdt !== null) {
      addIf(
        blockers,
        new ExactDecimal(networkFeeUsdt).greaterThan(
          limits.maximumNetworkFeeUsdt!,
        ),
        'network_fee_exceeds_limit',
      );
    }
  }

  return {
    scope: 'real_execution_quote_risk',
    status: blockers.length === 0 ? 'within_quote_limits' : 'blocked',
    blockers,
    orderNotionalUsdt,
    providerFeeRate,
    networkFeeUsdt,
    dailySpendEvaluated: false,
    bankrollEvaluated: false,
    riskApproved: false,
    fundingAuthorized: false,
    quoteAuthorized: false,
    submissionAuthorized: false,
    evaluatedAt: new Date(evaluatedAt),
  };
}

function isValidIntent(intent: RealExecutionIntent): boolean {
  try {
    validateRealExecutionIntent(intent);
    return true;
  } catch {
    return false;
  }
}

function isValidQuote(quote: RealExecutionQuote): boolean {
  try {
    validateRealExecutionQuote(quote);
    return true;
  } catch {
    return false;
  }
}

function sameIntent(
  expected: RealExecutionIntent,
  observed: RealExecutionIntent,
): boolean {
  return (
    expected.id === observed.id &&
    expected.idempotencyKey === observed.idempotencyKey &&
    expected.kind === observed.kind &&
    expected.chainId === observed.chainId &&
    sameAsset(expected.sourceAsset, observed.sourceAsset) &&
    sameAsset(expected.targetAsset, observed.targetAsset) &&
    expected.sourceQuantity === observed.sourceQuantity &&
    expected.maxSlippageRate === observed.maxSlippageRate &&
    expected.createdAt.getTime() === observed.createdAt.getTime()
  );
}

function sameAsset(
  expected: RealExecutionAsset,
  observed: RealExecutionAsset,
): boolean {
  return (
    expected.tokenAddress.toLowerCase() ===
      observed.tokenAddress.toLowerCase() && expected.symbol === observed.symbol
  );
}

function approvedDirection(intent: RealExecutionIntent): boolean {
  const approved = APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT;
  const source = intent.sourceAsset.tokenAddress.toLowerCase();
  const target = intent.targetAsset.tokenAddress.toLowerCase();
  return (
    intent.chainId === approved.chainId &&
    ((source === approved.usdt.tokenAddress &&
      target === approved.btc.tokenAddress) ||
      (source === approved.btc.tokenAddress &&
        target === approved.usdt.tokenAddress))
  );
}

function deriveOrderNotionalUsdt(
  intent: RealExecutionIntent,
  quote: RealExecutionQuote,
): string | null {
  const approved = APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT;
  const source = intent.sourceAsset.tokenAddress.toLowerCase();
  const target = intent.targetAsset.tokenAddress.toLowerCase();
  if (source === approved.usdt.tokenAddress) return intent.sourceQuantity;
  if (target === approved.usdt.tokenAddress)
    return quote.expectedTargetQuantity;
  return null;
}

function deriveProviderFeeRate(
  intent: RealExecutionIntent,
  quote: RealExecutionQuote,
  blockers: RealExecutionQuoteRiskBlocker[],
): string | null {
  const costs = quote.costs.filter((cost) => cost.kind === 'provider_fee');
  if (costs.length === 0) {
    addIf(blockers, true, 'provider_fee_missing');
    return null;
  }
  if (
    costs.some(
      (cost) =>
        cost.asset.tokenAddress.toLowerCase() !==
        intent.sourceAsset.tokenAddress.toLowerCase(),
    )
  ) {
    addIf(blockers, true, 'provider_fee_not_source_asset');
    return null;
  }
  const total = costs.reduce(
    (sum, cost) => sum.plus(cost.quantity),
    new ExactDecimal(0),
  );
  return total.dividedBy(intent.sourceQuantity).toFixed();
}

function deriveNetworkFeeUsdt(
  quote: RealExecutionQuote,
  blockers: RealExecutionQuoteRiskBlocker[],
): string | null {
  const costs = quote.costs.filter((cost) => cost.kind === 'network_fee');
  if (costs.length === 0) {
    addIf(blockers, true, 'network_fee_missing');
    return null;
  }
  const usdt = APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT.usdt;
  if (
    costs.some(
      (cost) => cost.asset.tokenAddress.toLowerCase() !== usdt.tokenAddress,
    )
  ) {
    addIf(blockers, true, 'network_fee_not_usdt');
    return null;
  }
  return costs
    .reduce((sum, cost) => sum.plus(cost.quantity), new ExactDecimal(0))
    .toFixed();
}

function validateEvaluationTime(evaluatedAt: Date): void {
  if (
    !(evaluatedAt instanceof Date) ||
    !Number.isFinite(evaluatedAt.getTime())
  ) {
    throw new Error('Real execution quote risk evaluation time must be valid');
  }
}

function addIf(
  blockers: RealExecutionQuoteRiskBlocker[],
  condition: boolean,
  blocker: RealExecutionQuoteRiskBlocker,
): void {
  if (condition && !blockers.includes(blocker)) blockers.push(blocker);
}
