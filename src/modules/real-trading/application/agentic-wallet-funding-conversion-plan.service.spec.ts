import { jest } from '@jest/globals';
import { ConfigService } from '@nestjs/config';
import { AgenticWalletFundingConversionQuoteService } from './agentic-wallet-funding-conversion-quote.service';
import { AgenticWalletFundingConversionPlanService } from './agentic-wallet-funding-conversion-plan.service';
import { AgenticWalletFundingConversionPlanStore } from './agentic-wallet-funding-conversion-plan.store';
import {
  BSC_NATIVE_BNB_ADDRESS,
  BSC_USDT_ADDRESS,
} from '../infrastructure/agentic-wallet-funding-conversion-quote.adapter';

describe('AgenticWalletFundingConversionPlanService', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-22T12:00:02.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('binds one fresh BNB-to-USDT quote to an inert command preview', async () => {
    const load = jest.fn(() => Promise.resolve(availableQuote()));
    const create = jest.fn((record) =>
      Promise.resolve({ ...record, stored: true }),
    );
    const service = createService(load, enabledEnvironment(), create);

    const result = await service.prepare(planRequest());

    expect(load).toHaveBeenCalledWith({ sourceQuantityBnb: '0.008' });
    expect(result).toMatchObject({
      scope: 'agentic_wallet_funding_conversion_plan',
      status: 'plan_ready',
      activationBlockers: [],
      executionConfigurationReady: true,
      finalConfirmationRequired: true,
      providerSubmissionStarted: false,
      conversionAuthorized: false,
      submissionAuthorized: false,
      plan: {
        provider: 'agentic_wallet',
        chainId: '56',
        sourceTokenAddress: BSC_NATIVE_BNB_ADDRESS,
        targetTokenAddress: BSC_USDT_ADDRESS,
        sourceQuantityBnb: '0.008',
        expectedUsdt: '5.92',
        minimumUsdt: '5.8',
        maximumSlippagePercent: '0.5',
        remainingQuantityBnb: '0.00175323',
        mevProtection: true,
        gasLevel: 'MEDIUM',
        command: {
          kind: 'agentic_wallet_market_order_swap_command_preview',
          executable: false,
        },
        automaticRetryAllowed: false,
        providerSubmissionStarted: false,
        conversionAuthorized: false,
        submissionAuthorized: false,
      },
    });
    expect(result.plan?.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(result.plan?.fingerprint).toMatch(/^[a-f0-9]{64}$/);
    expect(result.plan?.confirmationPhrase).toBe(
      [
        'CONFIRM_BNB_TO_USDT',
        result.plan?.id,
        '0.008',
        '5.8',
        result.plan?.fingerprint,
      ].join(' '),
    );
    expect(result.plan?.command.arguments).toEqual([
      'market-order',
      'swap',
      '--fromTokenQty',
      '0.008',
      '--fromToken',
      BSC_NATIVE_BNB_ADDRESS,
      '--toToken',
      BSC_USDT_ADDRESS,
      '--binanceChainId',
      '56',
      '--slippage',
      '0.5',
      '--mev',
      'true',
      '--gasLevel',
      'MEDIUM',
      '--json',
    ]);
    const persisted = create.mock.calls[0]?.[0] as {
      plan: unknown;
      confirmationPhraseDigest: string;
      activationBlockers: unknown[];
      executionConfigurationReady: boolean;
      preparedAt: Date;
    };
    expect(persisted.plan).toBe(result.plan);
    expect(persisted.confirmationPhraseDigest).toMatch(/^[a-f0-9]{64}$/);
    expect(persisted.activationBlockers).toEqual([]);
    expect(persisted.executionConfigurationReady).toBe(true);
    expect(persisted.preparedAt).toEqual(new Date('2026-10-22T12:00:02.000Z'));
  });

  it('exposes every independent activation blocker without authorizing submission', async () => {
    const service = createService(
      jest.fn(() => Promise.resolve(availableQuote())),
      {
        TRADING_MODE: 'paper',
        REAL_EXECUTION_ENABLED: false,
        REAL_EXECUTION_APPROVED_PROVIDER_ID: null,
        REAL_EXECUTION_APPROVED_CHAIN_ID: null,
        REAL_EXECUTION_APPROVED_SOURCE_TOKEN_ADDRESS: null,
        REAL_EXECUTION_APPROVED_TARGET_TOKEN_ADDRESS: null,
        FUNDING_CONVERSION_MIN_GAS_RESERVE_BNB: null,
      },
      jest.fn((record) => Promise.resolve({ ...record, stored: true })),
    );

    await expect(service.prepare(planRequest())).resolves.toMatchObject({
      status: 'plan_ready',
      activationBlockers: [
        'trading_mode_not_real',
        'real_execution_disabled',
        'provider_not_approved',
        'chain_not_approved',
        'source_token_not_approved',
        'target_token_not_approved',
        'minimum_gas_reserve_unconfigured',
      ],
      executionConfigurationReady: false,
      finalConfirmationRequired: true,
      providerSubmissionStarted: false,
      conversionAuthorized: false,
      submissionAuthorized: false,
    });
  });

  it('does not create a command when the fresh quote is blocked', async () => {
    const blocked = availableQuote();
    blocked.status = 'blocked';
    blocked.blockers = ['funding_verification_blocked'];
    blocked.quote = null;
    blocked.remainingQuantityBnb = null;
    const service = createService(
      jest.fn(() => Promise.resolve(blocked)),
      enabledEnvironment(),
      jest.fn((record) => Promise.resolve({ ...record, stored: true })),
    );

    await expect(service.prepare(planRequest())).resolves.toMatchObject({
      status: 'blocked',
      plan: null,
      providerSubmissionStarted: false,
      conversionAuthorized: false,
      submissionAuthorized: false,
    });
  });

  it('blocks activation when the configured gas reserve exceeds the remainder', async () => {
    const environment = enabledEnvironment();
    environment.FUNDING_CONVERSION_MIN_GAS_RESERVE_BNB = '0.002';
    const service = createService(
      jest.fn(() => Promise.resolve(availableQuote())),
      environment,
      jest.fn((record) => Promise.resolve({ ...record, stored: true })),
    );

    await expect(service.prepare(planRequest())).resolves.toMatchObject({
      status: 'plan_ready',
      activationBlockers: ['remaining_bnb_below_minimum_gas_reserve'],
      executionConfigurationReady: false,
      plan: {
        minimumGasReserveBnb: '0.002',
        confirmationExpiresAt: new Date('2026-10-22T12:03:02.000Z'),
      },
    });
  });

  it('does not expose a plan when durable persistence fails', async () => {
    const failure = new Error('database unavailable');
    const service = createService(
      jest.fn(() => Promise.resolve(availableQuote())),
      enabledEnvironment(),
      jest.fn(() => Promise.reject(failure)),
    );
    await expect(service.prepare(planRequest())).rejects.toBe(failure);
  });

  it('propagates request rejection before constructing a plan', async () => {
    const load = jest.fn(() => Promise.resolve(availableQuote()));
    const service = createService(
      load,
      enabledEnvironment(),
      jest.fn((record) => Promise.resolve({ ...record, stored: true })),
    );
    await expect(
      service.prepare({ sourceQuantityBnb: '0', minimumUsdt: '5.8' }),
    ).rejects.toThrow(
      'sourceQuantityBnb and minimumUsdt must be canonical positive decimal strings',
    );
    expect(load).not.toHaveBeenCalled();
  });

  it('does not persist a plan when the operator floor exceeds the quoted minimum', async () => {
    const create = jest.fn((record) =>
      Promise.resolve({ ...record, stored: true }),
    );
    const service = createService(
      jest.fn(() => Promise.resolve(availableQuote())),
      enabledEnvironment(),
      create,
    );

    await expect(
      service.prepare({
        sourceQuantityBnb: '0.008',
        minimumUsdt: '5.9',
      }),
    ).resolves.toMatchObject({
      status: 'blocked',
      activationBlockers: ['operator_minimum_above_quote_minimum'],
      executionConfigurationReady: false,
      plan: null,
      providerSubmissionStarted: false,
      conversionAuthorized: false,
      submissionAuthorized: false,
    });
    expect(create).not.toHaveBeenCalled();
  });

  it.each([
    { sourceQuantityBnb: '0.008' },
    { sourceQuantityBnb: '0.008', minimumUsdt: '0' },
    { sourceQuantityBnb: '0.008', minimumUsdt: '5.8', execute: false },
  ])('rejects a malformed strict plan request %#', async (request) => {
    const load = jest.fn(() => Promise.resolve(availableQuote()));
    const service = createService(
      load,
      enabledEnvironment(),
      jest.fn((record) => Promise.resolve({ ...record, stored: true })),
    );

    await expect(service.prepare(request)).rejects.toThrow(
      'sourceQuantityBnb and minimumUsdt must be canonical positive decimal strings',
    );
    expect(load).not.toHaveBeenCalled();
  });
});

function planRequest() {
  return { sourceQuantityBnb: '0.008', minimumUsdt: '5.8' };
}

function createService(
  load: jest.Mock,
  environment: Record<string, unknown>,
  create: jest.Mock,
): AgenticWalletFundingConversionPlanService {
  return new AgenticWalletFundingConversionPlanService(
    { load } as unknown as AgenticWalletFundingConversionQuoteService,
    {
      get: (name: string) => environment[name],
    } as unknown as ConfigService,
    { create } as unknown as AgenticWalletFundingConversionPlanStore,
  );
}

function enabledEnvironment(): Record<string, unknown> {
  return {
    TRADING_MODE: 'real',
    REAL_EXECUTION_ENABLED: true,
    REAL_EXECUTION_APPROVED_PROVIDER_ID: 'agentic_wallet',
    REAL_EXECUTION_APPROVED_CHAIN_ID: '56',
    REAL_EXECUTION_APPROVED_SOURCE_TOKEN_ADDRESS: BSC_NATIVE_BNB_ADDRESS,
    REAL_EXECUTION_APPROVED_TARGET_TOKEN_ADDRESS: BSC_USDT_ADDRESS,
    FUNDING_CONVERSION_MIN_GAS_RESERVE_BNB: '0.001',
  };
}

function availableQuote() {
  return {
    scope: 'agentic_wallet_funding_conversion_quote' as const,
    status: 'quote_available' as 'quote_available' | 'blocked',
    blockers: [] as string[],
    balanceObservedAt: new Date('2026-10-22T12:00:00.000Z'),
    walletBalanceBnb: '0.00975323',
    requestedQuantityBnb: '0.008',
    remainingQuantityBnb: '0.00175323' as string | null,
    gasReserveSufficiency: 'unverified' as const,
    quote: {
      provider: 'agentic_wallet' as const,
      sourceQuantityBnb: '0.008',
      expectedUsdt: '5.92',
      minimumUsdt: '5.8904',
      observedSlippageRate: '0.005',
      maximumSlippageRate: '0.005',
      quotedAt: new Date('2026-10-22T12:00:01.000Z'),
      expiresAt: new Date('2026-10-22T12:00:06.000Z'),
      costCoverage: 'partial' as const,
      executable: false as const,
    } as {
      provider: 'agentic_wallet';
      sourceQuantityBnb: string;
      expectedUsdt: string;
      minimumUsdt: string;
      observedSlippageRate: string;
      maximumSlippageRate: string;
      quotedAt: Date;
      expiresAt: Date;
      costCoverage: 'partial';
      executable: false;
    } | null,
    providerCallStarted: true,
    automaticRefresh: false as const,
    conversionAuthorized: false as const,
    submissionAuthorized: false as const,
  };
}
