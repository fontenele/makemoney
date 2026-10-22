import { jest } from '@jest/globals';
import {
  AgenticWalletFundingConversionQuoteService,
  InvalidFundingConversionQuoteRequestError,
} from './agentic-wallet-funding-conversion-quote.service';
import { RealTradingStatusService } from './real-trading-status.service';
import { AgenticWalletFundingConversionQuoteAdapter } from '../infrastructure/agentic-wallet-funding-conversion-quote.adapter';

describe('AgenticWalletFundingConversionQuoteService', () => {
  it('quotes only after a fresh verified balance and leaves BNB unspent', async () => {
    const verifyFunding = jest.fn(() => Promise.resolve(verification()));
    const getLocalStatus = jest.fn(() => localStatus('0.005'));
    const load = jest.fn(() => Promise.resolve(providerQuote()));
    const service = createService(verifyFunding, getLocalStatus, load);

    await expect(service.load({ sourceQuantityBnb: '0.008' })).resolves.toEqual(
      {
        scope: 'agentic_wallet_funding_conversion_quote',
        status: 'quote_available',
        blockers: [],
        balanceObservedAt: new Date('2026-10-22T12:00:00.000Z'),
        walletBalanceBnb: '0.00975323',
        requestedQuantityBnb: '0.008',
        remainingQuantityBnb: '0.00175323',
        gasReserveSufficiency: 'unverified',
        quote: providerQuote(),
        providerCallStarted: true,
        automaticRefresh: false,
        conversionAuthorized: false,
        submissionAuthorized: false,
      },
    );
    expect(load).toHaveBeenCalledWith('0.008', '0.005');
  });

  it('blocks before quoting when the amount would consume the complete BNB balance', async () => {
    const load = jest.fn(() => Promise.resolve(providerQuote()));
    const service = createService(
      jest.fn(() => Promise.resolve(verification())),
      jest.fn(() => localStatus('0.005')),
      load,
    );

    await expect(
      service.load({ sourceQuantityBnb: '0.00975323' }),
    ).resolves.toMatchObject({
      status: 'blocked',
      blockers: ['source_quantity_must_leave_bnb_for_gas'],
      remainingQuantityBnb: null,
      providerCallStarted: false,
      conversionAuthorized: false,
      submissionAuthorized: false,
    });
    expect(load).not.toHaveBeenCalled();
  });

  it('blocks before quoting when wallet verification or slippage policy is unavailable', async () => {
    const load = jest.fn(() => Promise.resolve(providerQuote()));
    const blocked = verification();
    blocked.status = 'blocked';
    blocked.blockers = ['gas_read_unavailable'];
    const service = createService(
      jest.fn(() => Promise.resolve(blocked)),
      jest.fn(() => localStatus(null)),
      load,
    );

    await expect(
      service.load({ sourceQuantityBnb: '0.008' }),
    ).resolves.toMatchObject({
      status: 'blocked',
      blockers: [
        'funding_verification_blocked',
        'maximum_slippage_unconfigured',
      ],
      providerCallStarted: false,
    });
    expect(load).not.toHaveBeenCalled();
  });

  it.each([
    null,
    {},
    { sourceQuantityBnb: 1 },
    { sourceQuantityBnb: '0' },
    { sourceQuantityBnb: '01' },
    { sourceQuantityBnb: '0.1', extra: true },
  ])('rejects malformed request %# before any wallet read', async (request) => {
    const verifyFunding = jest.fn(() => Promise.resolve(verification()));
    const service = createService(
      verifyFunding,
      jest.fn(() => localStatus('0.005')),
      jest.fn(() => Promise.resolve(providerQuote())),
    );
    await expect(service.load(request)).rejects.toBeInstanceOf(
      InvalidFundingConversionQuoteRequestError,
    );
    expect(verifyFunding).not.toHaveBeenCalled();
  });
});

function createService(
  verifyFunding: jest.Mock,
  getLocalStatus: jest.Mock,
  load: jest.Mock,
): AgenticWalletFundingConversionQuoteService {
  return new AgenticWalletFundingConversionQuoteService(
    { verifyFunding, getLocalStatus } as unknown as RealTradingStatusService,
    { load } as unknown as AgenticWalletFundingConversionQuoteAdapter,
  );
}

function verification() {
  return {
    scope: 'agentic_wallet_funding_verification' as const,
    status: 'funds_observed' as 'funds_observed' | 'blocked',
    blockers: [] as string[],
    observedAt: new Date('2026-10-22T12:00:00.000Z'),
    assets: [
      {
        symbol: 'BNB' as const,
        role: 'network_gas' as const,
        reportStatus: 'reported' as const,
        quantity: '0.00975323',
      },
    ],
    unsupportedAssetCount: 0,
    strategyQuoteAssetReported: false,
    conversionRequiredForBuyCapital: true,
    additionalFundingRequired: false as const,
    fundingAuthorized: false as const,
    quoteAuthorized: false as const,
    submissionAuthorized: false as const,
  };
}

function localStatus(maximumSlippageRate: string | null) {
  return {
    localRiskLimits: { limits: { maximumSlippageRate } },
  };
}

function providerQuote() {
  return {
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
  };
}
