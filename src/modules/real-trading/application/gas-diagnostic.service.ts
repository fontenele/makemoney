import { createHash, randomUUID } from 'node:crypto';
import Decimal from 'decimal.js';
import { ConfigService } from '@nestjs/config';
import { EmergencyStopService } from '../../risk-engine/application/emergency-stop.service';
import { assessGasDiagnosticRisk } from '../../risk-engine/application/gas-diagnostic-risk';
import { AgenticWalletMarketCostPreviewService } from './agentic-wallet-market-cost-preview.service';
import { RealTradingStatusService } from './real-trading-status.service';
import { APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT as instrument } from './real-execution-instrument-approval';
import {
  GasDiagnosticBlockedError,
  GasDiagnosticPlan,
  GasDiagnosticStore,
  InvalidGasDiagnosticRequestError,
} from './gas-diagnostic-store';

const D = Decimal.clone({ precision: 80, toExpNeg: -80, toExpPos: 80 });
export const GAS_DIAGNOSTIC_ACK =
  'confirm_single_1_usdt_btcb_gas_test_unknown_network_cost_no_retry';
const UUID =
  /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;

export interface GasDiagnosticTransport {
  submit(slippageRate: string): Promise<string | null>;
  measure(orderId: string, walletHash: string): Promise<unknown>;
}

export class GasDiagnosticService {
  private busy = false;
  constructor(
    private readonly config: Pick<ConfigService, 'get'>,
    private readonly wallet: Pick<
      RealTradingStatusService,
      | 'getLocalStatus'
      | 'verifyFunding'
      | 'observeWallet'
      | 'loadFundingValuation'
    >,
    private readonly quotes: Pick<
      AgenticWalletMarketCostPreviewService,
      'load'
    >,
    private readonly stop: Pick<EmergencyStopService, 'isActive'>,
    private readonly store: GasDiagnosticStore,
    private readonly transport: GasDiagnosticTransport,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async prepare(body: unknown) {
    if (!record(body) || Object.keys(body).length)
      throw new InvalidGasDiagnosticRequestError(
        'Expected an empty diagnostic preparation body',
      );
    return this.exclusive(async () => {
      this.requireEnabled(false);
      const evidence = await this.assess();
      const quote = await this.quotes.load({
        side: 'buy',
        sourceQuantity: '1',
      });
      if (
        !quote.quote ||
        !quote.quoteCurrent ||
        !quote.feeEvidence ||
        this.now() >= evidence.freshUntil ||
        this.now() >= quote.quote.expiresAt
      )
        throw new GasDiagnosticBlockedError(
          'Fresh diagnostic quote is unavailable',
        );
      this.checkFee(quote.feeEvidence.providerFeeRate);
      const slippage = quote.quote.intent.maxSlippageRate;
      if (new D(slippage).gt('0.005'))
        throw new GasDiagnosticBlockedError(
          'Diagnostic slippage exceeds 0.5 percent',
        );
      const at = this.now();
      const facts = {
        id: randomUUID(),
        walletHash: evidence.walletHash,
        expectedBtcb: quote.quote.expectedTargetQuantity,
        minimumBtcb: quote.quote.minimumTargetQuantity,
        slippageRate: slippage,
        nativeBnbAtRisk: evidence.bnb,
        referenceBnbUsdt: evidence.bnbUsdt,
        networkBudgetUsdt: evidence.networkBudgetUsdt,
        maximumPotentialLossUsdt: evidence.maximumPotentialLossUsdt,
        createdAt: at.toISOString(),
        expiresAt: new Date(at.getTime() + 180000).toISOString(),
      };
      const plan: GasDiagnosticPlan = {
        ...facts,
        fingerprint: digest(JSON.stringify(facts)),
      };
      await this.store.prepare(plan);
      return this.review(plan);
    });
  }

  async submit(body: unknown) {
    if (
      !record(body) ||
      Object.keys(body).sort().join(',') !==
        'acknowledgment,fingerprint,planId' ||
      typeof body.planId !== 'string' ||
      !UUID.test(body.planId) ||
      typeof body.fingerprint !== 'string' ||
      !/^[a-f0-9]{64}$/.test(body.fingerprint) ||
      body.acknowledgment !== GAS_DIAGNOSTIC_ACK
    )
      throw new InvalidGasDiagnosticRequestError(
        'Explicit diagnostic plan identity and immediate acknowledgment are required',
      );
    const { planId, fingerprint } = body;
    return this.exclusive(async () => {
      this.requireEnabled(true);
      const existing = await this.store.read(planId);
      if (
        !existing ||
        existing.state !== 'prepared' ||
        existing.plan.fingerprint !== fingerprint ||
        new Date(existing.plan.expiresAt) <= this.now()
      )
        throw new GasDiagnosticBlockedError(
          'Diagnostic plan expired, changed or was already claimed',
        );
      const evidence = await this.assess();
      if (
        evidence.walletHash !== existing.plan.walletHash ||
        evidence.networkBudgetUsdt !== existing.plan.networkBudgetUsdt ||
        new D(evidence.bnb).gt(existing.plan.nativeBnbAtRisk) ||
        new D(evidence.maximumPotentialLossUsdt).gt(
          existing.plan.maximumPotentialLossUsdt,
        )
      )
        throw new GasDiagnosticBlockedError(
          'Wallet or diagnostic loss envelope changed; prepare and review a new plan',
        );
      const quote = await this.quotes.load({
        side: 'buy',
        sourceQuantity: '1',
      });
      if (
        !quote.quote ||
        !quote.quoteCurrent ||
        !quote.feeEvidence ||
        this.now() >= evidence.freshUntil ||
        this.now() >= quote.quote.expiresAt ||
        quote.quote.intent.maxSlippageRate !== existing.plan.slippageRate ||
        new D(quote.quote.minimumTargetQuantity).lt(existing.plan.minimumBtcb)
      )
        throw new GasDiagnosticBlockedError(
          'Final fresh quote does not preserve the reviewed diagnostic floor',
        );
      this.checkFee(quote.feeEvidence.providerFeeRate);
      this.requireEnabled(true);
      await this.store.claim(planId, fingerprint);
      // Durable claim precedes the sole provider mutation. Failure is ambiguous;
      // neither this method nor a repeated request may send another transaction.
      let orderId: string | null = null;
      try {
        orderId = await this.transport.submit(existing.plan.slippageRate);
      } catch {
        /* Persist unknown, never retry. */
      }
      await this.store.recordOutcome(planId, orderId);
      return {
        planId,
        state: orderId
          ? 'submitted_pending_confirmation'
          : 'submission_outcome_unknown',
        providerOrderId: orderId,
        executionSucceeded: false,
        automaticRetryAllowed: false,
      };
    });
  }

  async read(id: string) {
    if (!UUID.test(id))
      throw new InvalidGasDiagnosticRequestError('Invalid diagnostic plan id');
    const value = await this.store.read(id);
    if (!value)
      throw new GasDiagnosticBlockedError('Diagnostic plan not found');
    const measured = value.providerOrderId
      ? await this.transport.measure(
          value.providerOrderId,
          value.plan.walletHash,
        )
      : null;
    const measurement =
      record(measured) &&
      typeof measured.measuredNetworkFeeBnb === 'string' &&
      /^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(measured.measuredNetworkFeeBnb)
        ? {
            ...measured,
            indicativeNetworkFeeUsdt: new D(measured.measuredNetworkFeeBnb)
              .times(value.plan.referenceBnbUsdt)
              .toDecimalPlaces(18, Decimal.ROUND_UP)
              .toFixed(),
            indicativeGasPercentageOfOneUsdt: new D(
              measured.measuredNetworkFeeBnb,
            )
              .times(value.plan.referenceBnbUsdt)
              .times(100)
              .toDecimalPlaces(18, Decimal.ROUND_UP)
              .toFixed(),
            conversionBasis:
              'preparation_bnb_usdt_price_not_historical_execution_price',
          }
        : measured;
    return {
      ...this.review(value.plan),
      state: value.state,
      measurement,
    };
  }

  private async assess() {
    const local = this.wallet.getLocalStatus();
    const limits = local.localRiskLimits.limits;
    if (
      local.localRiskLimits.status !== 'defined' ||
      Object.values(limits).some((value) => value === null)
    )
      throw new GasDiagnosticBlockedError('Local risk limits are incomplete');
    const observation = await this.wallet.observeWallet();
    const funding = await this.wallet.verifyFunding();
    const valuation = await this.wallet.loadFundingValuation();
    const at = this.now();
    if (
      observation.connection !== 'connected' ||
      !observation.quota ||
      observation.quota.date !== at.toISOString().slice(0, 10) ||
      funding.status !== 'funds_observed' ||
      !funding.walletAddress ||
      valuation.status !== 'available' ||
      !valuation.balance ||
      !valuation.prices ||
      !valuation.balance.totalValueUsdt ||
      !valuation.balance.quantityUsdt
    )
      throw new GasDiagnosticBlockedError(
        'Authenticated wallet, quota, balances and valuation are required',
      );
    const observationDates = [
      observation.observedAt,
      funding.observedAt,
      valuation.balanceObservedAt,
      valuation.pricesObservedAt,
    ];
    for (const date of observationDates)
      if (
        !date ||
        !Number.isFinite(date.getTime()) ||
        date > at ||
        at.getTime() - date.getTime() > 60000
      )
        throw new GasDiagnosticBlockedError(
          'Diagnostic wallet evidence is stale',
        );
    if (
      funding.assets.some(
        (asset) =>
          asset.symbol === 'BTCB' && new D(asset.quantity ?? '0').gt(0),
      )
    )
      throw new GasDiagnosticBlockedError(
        'Existing BTCB exposure requires review before a diagnostic buy',
      );
    const risk = assessGasDiagnosticRisk({
      sourceUsdt: '1',
      availableUsdt: valuation.balance.quantityUsdt,
      availableBnb: valuation.balance.quantityBnb,
      bnbUsdt: valuation.prices.bnbUsdt,
      walletValueUsdt: valuation.balance.totalValueUsdt,
      maximumOrderUsdt: limits.maximumOrderNotionalUsdt!,
      maximumDailySpendUsdt: limits.maximumDailySpendUsdt!,
      networkBudgetUsdt: limits.maximumNetworkFeeUsdt!,
      maximumBankrollUsdt: limits.maximumBankrollUsdt!,
      maximumDailyLossUsdt:
        this.config.get<string>('REAL_RISK_MAX_DAILY_LOSS_USDT') ?? '',
      quotaUsedUsd: observation.quota.usedUsd,
      quotaRemainingUsd: observation.quota.remainingUsd,
      emergencyStop: this.stop.isActive(),
      restrictiveWallet:
        observation.securityAssessment.status === 'restrictive',
    });
    if (risk.decision !== 'approved' || risk.maximumPotentialLossUsdt === null)
      throw new GasDiagnosticBlockedError(risk.blockers.join(', '));
    return {
      walletHash: digest(funding.walletAddress.toLowerCase()),
      bnb: valuation.balance.quantityBnb,
      bnbUsdt: valuation.prices.bnbUsdt,
      networkBudgetUsdt: limits.maximumNetworkFeeUsdt!,
      maximumPotentialLossUsdt: risk.maximumPotentialLossUsdt,
      freshUntil: new Date(
        Math.min(...observationDates.map((date) => date!.getTime())) + 60000,
      ),
    };
  }

  private requireEnabled(submitting: boolean) {
    if (
      this.config.get<string>('REAL_EXECUTION_APPROVED_PROVIDER_ID') !==
        instrument.providerId ||
      this.config.get<string>('REAL_EXECUTION_APPROVED_CHAIN_ID') !==
        instrument.chainId ||
      this.config
        .get<string>('REAL_EXECUTION_APPROVED_SOURCE_TOKEN_ADDRESS')
        ?.toLowerCase() !== instrument.usdt.tokenAddress ||
      this.config
        .get<string>('REAL_EXECUTION_APPROVED_TARGET_TOKEN_ADDRESS')
        ?.toLowerCase() !== instrument.btc.tokenAddress
    )
      throw new GasDiagnosticBlockedError(
        'Diagnostic provider, chain and USDT-to-BTCB instrument approvals are required',
      );
    if (
      this.config.get<boolean>('REAL_GAS_DIAGNOSTIC_ENABLED') !== true ||
      this.config.get<string>('TRADING_MODE') !== 'real' ||
      this.config.get<boolean>('REAL_EXECUTION_ENABLED') !== true ||
      this.stop.isActive()
    )
      throw new GasDiagnosticBlockedError(
        'Diagnostic activation gates or emergency stop block this operation',
      );
    if (
      submitting &&
      this.config.get<boolean>('REAL_EXECUTION_OPERATOR_SUBMISSION_ENABLED') !==
        true
    )
      throw new GasDiagnosticBlockedError('Operator submission is disabled');
  }

  private checkFee(rate: string) {
    const limit =
      this.wallet.getLocalStatus().localRiskLimits.limits
        .maximumProviderFeeRate;
    if (
      !limit ||
      !/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(rate) ||
      new D(rate).gt(limit)
    )
      throw new GasDiagnosticBlockedError(
        'Diagnostic provider fee rate exceeds its configured limit',
      );
  }

  private review(plan: GasDiagnosticPlan) {
    const { walletHash: _walletHash, ...publicPlan } = plan;
    void _walletHash;
    return {
      scope: 'single_btcb_gas_diagnostic',
      plan: publicPlan,
      sourceQuantityUsdt: '1',
      chainId: '56',
      targetSymbol: 'BTCB',
      gasEstimateAvailable: false,
      gasCostCeilingGuaranteed: false,
      networkBudgetLimitUsdt:
        this.wallet.getLocalStatus().localRiskLimits.limits
          .maximumNetworkFeeUsdt,
      networkBudgetEnforced: false,
      profitabilityFilterException: true,
      immediateConfirmationRequired: true,
      automaticRetryAllowed: false,
      automaticSellAllowed: false,
      submissionAuthorized: false,
    };
  }

  private async exclusive<T>(work: () => Promise<T>): Promise<T> {
    if (this.busy)
      throw new GasDiagnosticBlockedError(
        'A diagnostic request is already in progress',
      );
    this.busy = true;
    try {
      return await work();
    } finally {
      this.busy = false;
    }
  }
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function digest(value: string) {
  return createHash('sha256').update(value).digest('hex');
}
