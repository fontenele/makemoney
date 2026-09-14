import {
  ListingMarketObservation,
  validateListingMarketObservation,
} from './listing-market-observation';

describe('validateListingMarketObservation', () => {
  const validObservation = (): ListingMarketObservation => ({
    provider: 'binance',
    symbol: 'NEWUSDT',
    lastPrice: '0.00001000',
    baseVolume: '1200000.50000000',
    quoteVolume: '12.34567890',
    tradeCount: 42,
    windowOpenTime: new Date('2026-09-14T12:00:00.000Z'),
    windowCloseTime: new Date('2026-09-14T12:05:00.000Z'),
    receivedAt: new Date('2026-09-14T12:05:00.100Z'),
  });

  it('accepts a canonical observation while preserving decimal strings', () => {
    expect(() =>
      validateListingMarketObservation(validObservation()),
    ).not.toThrow();
  });

  it('accepts zero volumes, zero trades, equal window times, and independent receive clocks', () => {
    const observation = validObservation();
    observation.baseVolume = '0';
    observation.quoteVolume = '0.000';
    observation.tradeCount = 0;
    observation.windowCloseTime = observation.windowOpenTime;
    observation.receivedAt = new Date('2026-09-14T11:59:59.999Z');

    expect(() => validateListingMarketObservation(observation)).not.toThrow();
  });

  it.each(['newusdt', 'NEW/USDT', '', 'A'.repeat(31)])(
    'rejects non-canonical symbol %s',
    (symbol) => {
      expect(() =>
        validateListingMarketObservation({ ...validObservation(), symbol }),
      ).toThrow('symbol must be canonical');
    },
  );

  it.each(['0', '0.0', '-1', '01', '1e-8', 'NaN', ''])(
    'rejects invalid or non-positive last price %s',
    (lastPrice) => {
      expect(() =>
        validateListingMarketObservation({ ...validObservation(), lastPrice }),
      ).toThrow('last price must be positive');
    },
  );

  it.each(['-1', '01', '.1', '1.', '1e3', 'NaN', ''])(
    'rejects invalid volume %s',
    (baseVolume) => {
      expect(() =>
        validateListingMarketObservation({ ...validObservation(), baseVolume }),
      ).toThrow('base volume must be non-negative');
    },
  );

  it.each([-1, 1.5, Number.MAX_SAFE_INTEGER + 1, Number.NaN])(
    'rejects invalid trade count %s',
    (tradeCount) => {
      expect(() =>
        validateListingMarketObservation({ ...validObservation(), tradeCount }),
      ).toThrow('trade count must be a non-negative safe integer');
    },
  );

  it.each(['windowOpenTime', 'windowCloseTime', 'receivedAt'] as const)(
    'rejects invalid %s',
    (field) => {
      expect(() =>
        validateListingMarketObservation({
          ...validObservation(),
          [field]: new Date('invalid'),
        }),
      ).toThrow('must be valid');
    },
  );

  it('rejects an inverted provider window', () => {
    const observation = validObservation();
    observation.windowOpenTime = new Date('2026-09-14T12:06:00.000Z');

    expect(() => validateListingMarketObservation(observation)).toThrow(
      'window open time must not follow its close time',
    );
  });
});
