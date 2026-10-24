import { jest } from '@jest/globals';
import { ConfigService } from '@nestjs/config';

import { AgenticWalletFundingConversionQuoteService } from './agentic-wallet-funding-conversion-quote.service';
import { AgenticWalletFundingConversionSubmissionClaim } from './agentic-wallet-funding-conversion-submission-attempt.store';
import {
  AgenticWalletFundingConversionSubmissionOutcomeStore,
  FundingConversionSubmissionOutcomeRecord,
} from './agentic-wallet-funding-conversion-submission-outcome.store';
import {
  AgenticWalletFundingConversionSubmissionService,
  InvalidFundingConversionSubmissionRequestError,
} from './agentic-wallet-funding-conversion-submission.service';
import {
  BSC_NATIVE_BNB_ADDRESS,
  BSC_USDT_ADDRESS,
} from '../infrastructure/agentic-wallet-funding-conversion-quote.adapter';
import { AgenticWalletFundingConversionSwapCommand } from '../infrastructure/agentic-wallet-funding-conversion-swap-command-runner';

const ATTEMPT_ID = '019a0db1-bfea-7000-8000-000000000002';
const STARTED_AT = new Date('2026-10-22T12:00:30.000Z');
const COMPLETED_AT = new Date('2026-10-22T12:00:31.000Z');

describe('AgenticWalletFundingConversionSubmissionService', () => {
  it('re-quotes, claims once, invokes once, and stores only a pending outcome', async () => {
    const dependencies = createDependencies();
    const service = createService(dependencies);

    const result = await service.submit(request());

    expect(dependencies.quote).toHaveBeenCalledWith({
      sourceQuantityBnb: '0.008',
    });
    expect(dependencies.claim.mock.calls[0]?.[0]).toMatchObject({
      id: ATTEMPT_ID,
      freshSourceQuantityBnb: '0.008',
      freshExpectedUsdt: '5.95',
      freshMinimumUsdt: '5.92025',
      freshMaximumSlippagePercent: '0.5',
      freshRemainingQuantityBnb: '0.00175323',
      preConversionWalletAddress: '0x1234567890abcdef1234567890abcdef12345678',
      preConversionBalanceBlockNumber: '0x123',
      preConversionBnbBalance: '0.00975323',
      preConversionUsdtBalance: '0',
      preConversionBalanceObservedAt: new Date('2026-10-22T12:00:29.500Z'),
      providerFeeRate: '0',
      providerFeeUsd: '0',
      estimatedNetworkFeeUsd: '0.003',
      feeEvidenceGasMode: 'fast',
      feeEvidenceObservedAt: new Date('2026-10-22T12:00:29.750Z'),
      startedAt: STARTED_AT,
    });
    expect(dependencies.run).toHaveBeenCalledTimes(1);
    expect(dependencies.record.mock.calls[0]?.[0]).toMatchObject({
      outcome: {
        attemptId: ATTEMPT_ID,
        status: 'submitted_pending_confirmation',
        providerOrderId: 'order_123',
        executionSucceeded: false,
        statusLookupRequired: true,
        automaticRetryAllowed: false,
      },
      completedAt: COMPLETED_AT,
    });
    expect(result).toEqual({ persisted: true });
  });

  it('stores an unknown non-retryable outcome when the runner throws', async () => {
    const dependencies = createDependencies();
    dependencies.run.mockRejectedValueOnce(new Error('response lost'));
    const service = createService(dependencies);

    await service.submit(request());

    expect(dependencies.run).toHaveBeenCalledTimes(1);
    expect(dependencies.record.mock.calls[0]?.[0]).toMatchObject({
      outcome: {
        status: 'submission_outcome_unknown',
        providerOrderId: null,
        automaticRetryAllowed: false,
      },
      completedAt: COMPLETED_AT,
    });
  });

  it('does not call the provider when a durable claim is replayed', async () => {
    const dependencies = createDependencies();
    dependencies.claim.mockResolvedValueOnce({
      ...claimedAttempt(),
      replayed: true,
    });
    const service = createService(dependencies);

    await expect(service.submit(request())).rejects.toMatchObject({
      blocker: 'plan_already_consumed',
    });
    expect(dependencies.run).not.toHaveBeenCalled();
    expect(dependencies.record).not.toHaveBeenCalled();
  });

  it.each([
    [
      'configuration',
      { TRADING_MODE: 'paper' },
      'runtime_configuration_not_ready',
    ],
    ['emergency stop', {}, 'emergency_stop_active'],
  ])(
    'blocks %s before quote and provider access',
    async (_label, changed, blocker) => {
      const dependencies = createDependencies();
      const emergencyActive = _label === 'emergency stop';
      const service = createService(dependencies, changed, emergencyActive);

      await expect(service.submit(request())).rejects.toMatchObject({
        blocker,
      });
      expect(dependencies.quote).not.toHaveBeenCalled();
      expect(dependencies.claim).not.toHaveBeenCalled();
      expect(dependencies.run).not.toHaveBeenCalled();
    },
  );

  it('blocks an unavailable fresh quote before claim and provider access', async () => {
    const dependencies = createDependencies();
    dependencies.quote.mockResolvedValueOnce({
      ...availableQuote(),
      status: 'blocked',
      quote: null,
    });
    const service = createService(dependencies);

    await expect(service.submit(request())).rejects.toMatchObject({
      blocker: 'fresh_quote_unavailable',
    });
    expect(dependencies.claim).not.toHaveBeenCalled();
    expect(dependencies.run).not.toHaveBeenCalled();
  });

  it('blocks when the fixed-block BNB balance diverges from the fresh quote', async () => {
    const dependencies = createDependencies();
    dependencies.preBalance.mockResolvedValueOnce({
      scope: 'agentic_wallet_funding_conversion_pre_balance_snapshot',
      chainId: '56',
      walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
      blockNumber: '0x123',
      bnbBalance: '0.00975322',
      usdtBalance: '0',
      observedAt: new Date('2026-10-22T12:00:29.500Z'),
    });
    const service = createService(dependencies);

    await expect(service.submit(request())).rejects.toMatchObject({
      blocker: 'pre_conversion_balance_diverged_from_fresh_quote',
    });
    expect(dependencies.claim).not.toHaveBeenCalled();
    expect(dependencies.run).not.toHaveBeenCalled();
  });

  it('blocks an unapproved nonzero live provider fee before claim', async () => {
    const dependencies = createDependencies();
    dependencies.feeEvidence.mockResolvedValueOnce({
      ...(await dependencies.feeEvidence()),
      providerFeeRate: '0.005',
      providerFeeUsd: '0.03',
    });
    const service = createService(dependencies);

    await expect(service.submit(request())).rejects.toMatchObject({
      blocker: 'provider_fee_classification_not_approved',
    });
    expect(dependencies.claim).not.toHaveBeenCalled();
    expect(dependencies.run).not.toHaveBeenCalled();
  });

  it('blocks fee evidence whose later quote falls below the fresh minimum', async () => {
    const dependencies = createDependencies();
    dependencies.feeEvidence.mockResolvedValueOnce({
      ...(await dependencies.feeEvidence()),
      expectedUsdt: '5.920249999999999999',
    });
    const service = createService(dependencies);

    await expect(service.submit(request())).rejects.toMatchObject({
      blocker: 'provider_fee_classification_not_approved',
    });
    expect(dependencies.claim).not.toHaveBeenCalled();
    expect(dependencies.run).not.toHaveBeenCalled();
  });

  it('rejects extra request fields before any dependency access', async () => {
    const dependencies = createDependencies();
    const service = createService(dependencies);

    await expect(
      service.submit({ ...request(), execute: true }),
    ).rejects.toBeInstanceOf(InvalidFundingConversionSubmissionRequestError);
    expect(dependencies.quote).not.toHaveBeenCalled();
    expect(dependencies.run).not.toHaveBeenCalled();
  });
});

function createDependencies() {
  return {
    quote: jest.fn((request: unknown) => {
      void request;
      return Promise.resolve(availableQuote());
    }),
    preBalance: jest.fn(() =>
      Promise.resolve({
        scope:
          'agentic_wallet_funding_conversion_pre_balance_snapshot' as const,
        chainId: '56' as const,
        walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
        blockNumber: '0x123',
        bnbBalance: '0.00975323',
        usdtBalance: '0',
        observedAt: new Date('2026-10-22T12:00:29.500Z'),
      }),
    ),
    feeEvidence: jest.fn(() =>
      Promise.resolve({
        scope: 'agentic_wallet_funding_conversion_fee_evidence' as const,
        provider: 'agentic_wallet' as const,
        chainId: '56' as const,
        sourceQuantityBnb: '0.008',
        expectedUsdt: '5.94',
        maximumSlippagePercent: '0.5',
        providerFeeRate: '0',
        providerFeeUsd: '0',
        estimatedNetworkFeeUsd: '0.003',
        gasMode: 'fast',
        observedAt: new Date('2026-10-22T12:00:29.750Z'),
      }),
    ),
    claim: jest.fn((claim: AgenticWalletFundingConversionSubmissionClaim) => {
      void claim;
      return Promise.resolve(claimedAttempt());
    }),
    run: jest.fn((command: AgenticWalletFundingConversionSwapCommand) => {
      void command;
      return Promise.resolve({ success: true, data: { orderId: 'order_123' } });
    }),
    record: jest.fn((value: FundingConversionSubmissionOutcomeRecord) => {
      void value;
      return Promise.resolve({ persisted: true });
    }),
  };
}

function createService(
  dependencies: ReturnType<typeof createDependencies>,
  changed: Record<string, unknown> = {},
  emergencyActive = false,
) {
  const environment = {
    TRADING_MODE: 'real',
    REAL_EXECUTION_ENABLED: true,
    REAL_EXECUTION_APPROVED_PROVIDER_ID: 'agentic_wallet',
    REAL_EXECUTION_APPROVED_CHAIN_ID: '56',
    REAL_EXECUTION_APPROVED_SOURCE_TOKEN_ADDRESS: BSC_NATIVE_BNB_ADDRESS,
    REAL_EXECUTION_APPROVED_TARGET_TOKEN_ADDRESS: BSC_USDT_ADDRESS,
    FUNDING_CONVERSION_MIN_GAS_RESERVE_BNB: '0.001',
    ...changed,
  };
  const times = [STARTED_AT, COMPLETED_AT];
  return new AgenticWalletFundingConversionSubmissionService(
    {
      load: dependencies.quote,
    } as unknown as AgenticWalletFundingConversionQuoteService,
    {
      get: jest.fn((key: keyof typeof environment) => environment[key]),
    } as unknown as ConfigService,
    { isActive: () => emergencyActive },
    { load: dependencies.preBalance },
    { load: dependencies.feeEvidence },
    {
      claim: dependencies.claim,
    },
    {
      run: dependencies.run,
    },
    {
      record: dependencies.record,
    } as unknown as AgenticWalletFundingConversionSubmissionOutcomeStore,
    () => new Date(times.shift() ?? COMPLETED_AT),
    () => ATTEMPT_ID,
  );
}

function request() {
  return {
    planId: '019a0db1-bfea-7000-8000-000000000001',
    planFingerprint: 'a'.repeat(64),
    confirmationPhrase: 'CONFIRM_BNB_TO_USDT exact one-time phrase',
    sourceQuantityBnb: '0.008',
  };
}

function claimedAttempt() {
  return {
    attempt: {
      id: ATTEMPT_ID,
      planId: request().planId,
      requestFingerprint: 'c'.repeat(64),
      freshSourceQuantityBnb: '0.008',
      freshExpectedUsdt: '5.95',
      freshMinimumUsdt: '5.92025',
      freshMaximumSlippagePercent: '0.5',
      freshRemainingQuantityBnb: '0.00175323',
      preConversionWalletAddress: '0x1234567890abcdef1234567890abcdef12345678',
      preConversionBalanceBlockNumber: '0x123',
      preConversionBnbBalance: '0.00975323',
      preConversionUsdtBalance: '0',
      preConversionBalanceObservedAt: new Date('2026-10-22T12:00:29.500Z'),
      providerFeeRate: '0',
      providerFeeUsd: '0',
      estimatedNetworkFeeUsd: '0.003',
      feeEvidenceGasMode: 'fast',
      feeEvidenceObservedAt: new Date('2026-10-22T12:00:29.750Z'),
      state: 'submission_claimed' as const,
      automaticRetryAllowed: false as const,
      startedAt: STARTED_AT,
    },
    replayed: false,
  };
}

function availableQuote() {
  return {
    scope: 'agentic_wallet_funding_conversion_quote' as const,
    status: 'quote_available' as const,
    blockers: [],
    balanceObservedAt: new Date('2026-10-22T12:00:29.000Z'),
    walletAddress: '0x1234567890abcdef1234567890abcdef12345678',
    walletBalanceBnb: '0.00975323',
    requestedQuantityBnb: '0.008',
    remainingQuantityBnb: '0.00175323',
    gasReserveSufficiency: 'unverified' as const,
    quote: {
      provider: 'agentic_wallet' as const,
      chainId: '56' as const,
      sourceTokenAddress: BSC_NATIVE_BNB_ADDRESS,
      sourceSymbol: 'BNB' as const,
      sourceQuantityBnb: '0.008',
      targetTokenAddress: BSC_USDT_ADDRESS,
      targetSymbol: 'USDT' as const,
      expectedUsdt: '5.95',
      minimumUsdt: '5.92025',
      maximumSlippageRate: '0.005',
      quotedAt: new Date('2026-10-22T12:00:29.000Z'),
      expiresAt: new Date('2026-10-22T12:00:34.000Z'),
    },
    providerCallStarted: true,
    automaticRefresh: false as const,
    conversionAuthorized: false as const,
    submissionAuthorized: false as const,
  };
}
