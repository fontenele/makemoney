import { jest } from '@jest/globals';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { AgenticWalletFundingConversionPlanRecord } from '../application/agentic-wallet-funding-conversion-plan.store';
import { PrismaAgenticWalletFundingConversionPlanStore } from './prisma-agentic-wallet-funding-conversion-plan.store';
import {
  BSC_NATIVE_BNB_ADDRESS,
  BSC_USDT_ADDRESS,
} from './agentic-wallet-funding-conversion-quote.adapter';

describe('PrismaAgenticWalletFundingConversionPlanStore', () => {
  it('persists the complete plan while retaining only the confirmation digest', async () => {
    const create = jest.fn(() => Promise.resolve({ id: record().plan.id }));
    const store = new PrismaAgenticWalletFundingConversionPlanStore({
      agenticWalletFundingConversionPlan: { create },
    } as unknown as PrismaService);
    const input = record();

    const stored = await store.create(input);

    expect(create).toHaveBeenCalledWith({
      data: {
        id: input.plan.id,
        fingerprint: input.plan.fingerprint,
        confirmationPhraseDigest: input.confirmationPhraseDigest,
        providerId: 'agentic_wallet',
        chainId: '56',
        sourceTokenAddress: BSC_NATIVE_BNB_ADDRESS.toLowerCase(),
        targetTokenAddress: BSC_USDT_ADDRESS.toLowerCase(),
        sourceQuantityBnb: '0.008',
        expectedUsdt: '5.92',
        minimumUsdt: '5.8904',
        maximumSlippagePercent: '0.5',
        remainingQuantityBnb: '0.00175323',
        mevProtection: true,
        gasLevel: 'MEDIUM',
        costCoverage: 'partial',
        gasReserveSufficiency: 'unverified',
        activationBlockers: [],
        executionConfigurationReady: true,
        quotedAt: new Date('2026-10-22T12:00:01.000Z'),
        quoteExpiresAt: new Date('2026-10-22T12:00:06.000Z'),
        preparedAt: new Date('2026-10-22T12:00:02.000Z'),
      },
    });
    expect(stored).toMatchObject({ stored: true });
    expect(stored.plan).not.toBe(input.plan);
    expect(stored.plan.command.arguments).not.toBe(
      input.plan.command.arguments,
    );
    expect(JSON.stringify(create.mock.calls)).not.toContain(
      input.plan.confirmationPhrase,
    );
  });

  it('rejects malformed or expired evidence before database access', async () => {
    const create = jest.fn();
    const store = new PrismaAgenticWalletFundingConversionPlanStore({
      agenticWalletFundingConversionPlan: { create },
    } as unknown as PrismaService);
    const input = record();

    await expect(
      store.create({
        ...input,
        preparedAt: new Date('2026-10-22T12:00:06.000Z'),
      }),
    ).rejects.toThrow('plan record is invalid');
    expect(create).not.toHaveBeenCalled();
  });
});

function record(): AgenticWalletFundingConversionPlanRecord {
  const id = '019a0db1-bfea-7000-8000-000000000001';
  const fingerprint = 'a'.repeat(64);
  const confirmationPhrase = [
    'CONFIRM_BNB_TO_USDT',
    id,
    '0.008',
    '5.8904',
    fingerprint,
  ].join(' ');
  return {
    plan: {
      id,
      fingerprint,
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
      confirmationPhrase,
      quotedAt: new Date('2026-10-22T12:00:01.000Z'),
      expiresAt: new Date('2026-10-22T12:00:06.000Z'),
      costCoverage: 'partial',
      gasReserveSufficiency: 'unverified',
      command: {
        kind: 'agentic_wallet_market_order_swap_command_preview',
        arguments: [
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
        ],
        executable: false,
      },
      automaticRetryAllowed: false,
      providerSubmissionStarted: false,
      conversionAuthorized: false,
      submissionAuthorized: false,
    },
    confirmationPhraseDigest: 'b'.repeat(64),
    activationBlockers: [],
    executionConfigurationReady: true,
    preparedAt: new Date('2026-10-22T12:00:02.000Z'),
  };
}
