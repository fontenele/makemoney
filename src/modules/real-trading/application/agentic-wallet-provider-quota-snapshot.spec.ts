import {
  RealExecutionIntent,
  RealExecutionQuote,
} from '../domain/real-execution';
import { AgenticWalletCapabilityObservation } from '../infrastructure/agentic-wallet-capability.adapter';
import { prepareAgenticWalletProviderQuotaSnapshot } from './agentic-wallet-provider-quota-snapshot';
import { APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT } from './real-execution-instrument-approval';

const INTENT_ID = '00000000-0000-4000-8000-000000000032';
const QUOTE_ID = '00000000-0000-4000-8000-000000000033';
const { usdt, btc } = APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT;

describe('Agentic Wallet provider quota snapshot', () => {
  it('projects authenticated quota and explicit USD valuation without authority', () => {
    const result = prepareAgenticWalletProviderQuotaSnapshot(
      observation(),
      intent(),
      quote(),
      '5.2000',
      new Date('2026-10-28T14:00:01.000Z'),
    );

    expect(result).toEqual({
      scope: 'agentic_wallet_provider_quota_snapshot_assessment',
      status: 'provider_quota_snapshot_ready',
      blockers: [],
      quotaSnapshot: {
        providerId: 'agentic_wallet',
        chainId: '56',
        intentId: INTENT_ID,
        quoteId: QUOTE_ID,
        utcDay: '2026-10-28',
        dailyLimitUsd: '1000',
        usedUsd: '100',
        remainingUsd: '900',
        quotaCoverage: 'complete',
        requiredUsd: '5.2',
        requirementValuationBasis: 'explicit_external_usd_value',
        requirementCoverage: 'complete',
        quotaObservedAt: new Date('2026-10-28T14:00:00.000Z'),
        requirementValuedAt: new Date('2026-10-28T14:00:01.000Z'),
      },
      providerObservationValidated: true,
      requirementValuationExternallySupplied: true,
      providerDailyLimitAcceptedAsProjectRiskLimit: false,
      durableQuotaReservation: false,
      riskApproved: false,
      fundingAuthorized: false,
      quoteAuthorized: false,
      submissionAuthorized: false,
    });
  });

  it('supports the approved BTCB source direction', () => {
    const sellIntent = intent({
      sourceAsset: { tokenAddress: btc.tokenAddress, symbol: 'BTCB' },
      targetAsset: { tokenAddress: usdt.tokenAddress, symbol: 'USDT' },
      sourceQuantity: '0.001',
    });
    expect(
      prepareAgenticWalletProviderQuotaSnapshot(
        observation(),
        sellIntent,
        quote({ intent: sellIntent }),
        '82',
        new Date('2026-10-28T14:00:01.000Z'),
      ).status,
    ).toBe('provider_quota_snapshot_ready');
  });

  it('fails closed when provider quota evidence is unavailable or malformed', () => {
    expect(
      prepareAgenticWalletProviderQuotaSnapshot(
        observation({ quota: null }),
        intent(),
        quote(),
        '5.2',
        new Date('2026-10-28T14:00:01.000Z'),
      ).blockers,
    ).toEqual(['provider_quota_unavailable']);
    expect(
      prepareAgenticWalletProviderQuotaSnapshot(
        observation({
          quota: { usedUsd: '100', remainingUsd: '900', date: '2026-02-30' },
        }),
        intent(),
        quote(),
        '5.2',
        new Date('2026-10-28T14:00:01.000Z'),
      ).blockers,
    ).toEqual(['invalid_provider_quota']);
  });

  it('rejects capability, intent, quote, instrument, and valuation divergence', () => {
    const otherIntent = intent({
      sourceAsset: {
        tokenAddress: '0x1111111111111111111111111111111111111111',
        symbol: 'OTHER',
      },
    });
    const result = prepareAgenticWalletProviderQuotaSnapshot(
      observation({
        capabilities: {
          ...observation().capabilities,
          reads: { ...observation().capabilities.reads, quota: false },
        },
      }),
      otherIntent,
      quote({
        providerId: 'other_provider',
        intent: intent({ id: '00000000-0000-4000-8000-000000000034' }),
      }),
      '0',
      new Date('invalid'),
    );

    expect(result).toMatchObject({
      status: 'blocked',
      blockers: [
        'quota_read_unavailable',
        'quote_intent_mismatch',
        'quote_provider_mismatch',
        'instrument_not_approved',
        'invalid_required_usd',
        'invalid_requirement_valued_at',
      ],
      quotaSnapshot: null,
      requirementValuationExternallySupplied: false,
      riskApproved: false,
      submissionAuthorized: false,
    });
  });

  it('rejects a tampered adapter observation before projecting quota facts', () => {
    const value = observation();
    const result = prepareAgenticWalletProviderQuotaSnapshot(
      { ...value, cliVersion: '1.11.0' },
      intent(),
      quote(),
      '5.2',
      new Date('2026-10-28T14:00:01.000Z'),
    );

    expect(result).toMatchObject({
      status: 'blocked',
      blockers: ['invalid_wallet_capability_observation'],
      quotaSnapshot: null,
      providerObservationValidated: false,
    });
  });
});

function observation(
  overrides: Partial<AgenticWalletCapabilityObservation> = {},
): AgenticWalletCapabilityObservation {
  return {
    cliVersion: '1.10.0',
    requiredCliVersion: '1.10.0',
    capabilities: {
      providerId: 'agentic_wallet',
      connected: true,
      chains: [{ chainId: '56', operations: [] }],
      reads: {
        securitySettings: true,
        quota: true,
        balances: true,
        gas: true,
      },
      observedAt: new Date('2026-10-28T14:00:00.000Z'),
    },
    settings: {
      dailyLimitUsd: '1000',
      abnormalTransactionHandling: 'AutoReject',
      tradeAllTokens: false,
      predictionTradingEnabled: false,
      developerModeEnabled: false,
      sessionExpiresAt: new Date('2026-10-28T16:00:00.000Z'),
      signInMaximumAt: new Date('2027-10-28T14:00:00.000Z'),
      inactivitySignOutAt: new Date('2026-10-30T14:00:00.000Z'),
    },
    quota: { usedUsd: '100', remainingUsd: '900', date: '2026-10-28' },
    addresses: [],
    balances: [],
    gas: null,
    ...overrides,
  };
}

function intent(
  overrides: Partial<RealExecutionIntent> = {},
): RealExecutionIntent {
  return {
    id: INTENT_ID,
    idempotencyKey: 'provider-quota-snapshot-1',
    kind: 'market_swap',
    chainId: '56',
    sourceAsset: { tokenAddress: usdt.tokenAddress, symbol: 'USDT' },
    targetAsset: { tokenAddress: btc.tokenAddress, symbol: 'BTCB' },
    sourceQuantity: '5',
    maxSlippageRate: '0.005',
    createdAt: new Date('2026-10-28T13:59:58.000Z'),
    ...overrides,
  };
}

function quote(
  overrides: Partial<RealExecutionQuote> = {},
): RealExecutionQuote {
  const quoteIntent = overrides.intent ?? intent();
  return {
    id: QUOTE_ID,
    providerId: 'agentic_wallet',
    providerQuoteId: null,
    intent: quoteIntent,
    expectedTargetQuantity: '0.00005',
    minimumTargetQuantity: '0.000049',
    costs: [],
    costCoverage: 'partial',
    quotedAt: new Date('2026-10-28T13:59:59.000Z'),
    expiresAt: new Date('2026-10-28T14:00:04.000Z'),
    executable: false,
    ...overrides,
  };
}
