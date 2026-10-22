import { jest } from '@jest/globals';
import { ConfigService } from '@nestjs/config';
import { AgenticWalletFundingConversionQuoteService } from './agentic-wallet-funding-conversion-quote.service';
import { AgenticWalletFundingConversionPlanService } from './agentic-wallet-funding-conversion-plan.service';
import {
  BSC_NATIVE_BNB_ADDRESS,
  BSC_USDT_ADDRESS,
} from '../infrastructure/agentic-wallet-funding-conversion-quote.adapter';

describe('AgenticWalletFundingConversionPlanService', () => {
  it('binds one fresh BNB-to-USDT quote to an inert command preview', async () => {
    const load = jest.fn(() => Promise.resolve(availableQuote()));
    const service = createService(load, enabledEnvironment());

    const result = await service.prepare({ sourceQuantityBnb: '0.008' });

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
        minimumUsdt: '5.8904',
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
        '5.8904',
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
      },
    );

    await expect(
      service.prepare({ sourceQuantityBnb: '0.008' }),
    ).resolves.toMatchObject({
      status: 'plan_ready',
      activationBlockers: [
        'trading_mode_not_real',
        'real_execution_disabled',
        'provider_not_approved',
        'chain_not_approved',
        'source_token_not_approved',
        'target_token_not_approved',
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
    );

    await expect(
      service.prepare({ sourceQuantityBnb: '0.008' }),
    ).resolves.toMatchObject({
      status: 'blocked',
      plan: null,
      providerSubmissionStarted: false,
      conversionAuthorized: false,
      submissionAuthorized: false,
    });
  });

  it('propagates request rejection before constructing a plan', async () => {
    const failure = new Error('invalid request');
    const service = createService(
      jest.fn(() => Promise.reject(failure)),
      enabledEnvironment(),
    );
    await expect(service.prepare({ sourceQuantityBnb: '0' })).rejects.toBe(
      failure,
    );
  });
});

function createService(
  load: jest.Mock,
  environment: Record<string, unknown>,
): AgenticWalletFundingConversionPlanService {
  return new AgenticWalletFundingConversionPlanService(
    { load } as unknown as AgenticWalletFundingConversionQuoteService,
    {
      get: (name: string) => environment[name],
    } as unknown as ConfigService,
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
