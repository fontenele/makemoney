import { validateEnvironment } from './environment';

const required = {
  DATABASE_URL: 'postgresql://user:password@localhost:5433/database',
  REDIS_URL: 'redis://localhost:6379',
};

describe('validateEnvironment positive risk decimals', () => {
  it('accepts positive fractional limits, including the BTC position default', () => {
    expect(
      validateEnvironment({
        ...required,
        RISK_MAX_ORDER_NOTIONAL_USDT: '0.5',
        RISK_MAX_BTC_POSITION_QUANTITY: '0.01',
        RISK_MAX_DAILY_REALIZED_LOSS_USDT: '0.25',
        RISK_MAX_UNREALIZED_LOSS_USDT: '0.10',
      }),
    ).toMatchObject({
      RISK_MAX_ORDER_NOTIONAL_USDT: '0.5',
      RISK_MAX_BTC_POSITION_QUANTITY: '0.01',
      RISK_MAX_DAILY_REALIZED_LOSS_USDT: '0.25',
      RISK_MAX_UNREALIZED_LOSS_USDT: '0.10',
    });
  });

  it.each(['0', '0.0', '0.000', '-0.01', '.01', '1.', '01'])(
    'rejects non-positive or non-canonical risk decimal %s',
    (value) => {
      expect(() =>
        validateEnvironment({
          ...required,
          RISK_MAX_BTC_POSITION_QUANTITY: value,
        }),
      ).toThrow('Invalid environment configuration');
    },
  );
});

describe('validateEnvironment strategy periods', () => {
  it('uses conservative 3/5 defaults', () => {
    expect(validateEnvironment(required)).toMatchObject({
      STRATEGY_MA_SHORT_PERIOD: 3,
      STRATEGY_MA_LONG_PERIOD: 5,
    });
  });

  it('accepts custom integer periods', () => {
    expect(
      validateEnvironment({
        ...required,
        STRATEGY_MA_SHORT_PERIOD: '10',
        STRATEGY_MA_LONG_PERIOD: '30',
      }),
    ).toMatchObject({
      STRATEGY_MA_SHORT_PERIOD: 10,
      STRATEGY_MA_LONG_PERIOD: 30,
    });
  });

  it.each([
    { STRATEGY_MA_SHORT_PERIOD: 0, STRATEGY_MA_LONG_PERIOD: 5 },
    { STRATEGY_MA_SHORT_PERIOD: 1.5, STRATEGY_MA_LONG_PERIOD: 5 },
    { STRATEGY_MA_SHORT_PERIOD: 3, STRATEGY_MA_LONG_PERIOD: 3 },
    { STRATEGY_MA_SHORT_PERIOD: 5, STRATEGY_MA_LONG_PERIOD: 3 },
    { STRATEGY_MA_SHORT_PERIOD: 3, STRATEGY_MA_LONG_PERIOD: 1001 },
  ])('rejects invalid periods %#', (periods) => {
    expect(() => validateEnvironment({ ...required, ...periods })).toThrow(
      'Invalid environment configuration',
    );
  });
});

describe('validateEnvironment new-listing polling', () => {
  it('uses a one-minute default', () => {
    expect(validateEnvironment(required)).toMatchObject({
      NEW_LISTINGS_POLL_INTERVAL_MS: 60000,
    });
  });

  it('accepts bounded custom intervals', () => {
    expect(
      validateEnvironment({
        ...required,
        NEW_LISTINGS_POLL_INTERVAL_MS: '5000',
      }),
    ).toMatchObject({ NEW_LISTINGS_POLL_INTERVAL_MS: 5000 });
  });

  it.each([0, 4999, 5000.5])('rejects invalid interval %s', (interval) => {
    expect(() =>
      validateEnvironment({
        ...required,
        NEW_LISTINGS_POLL_INTERVAL_MS: interval,
      }),
    ).toThrow('Invalid environment configuration');
  });
});

describe('validateEnvironment new-listing checkpoint worker', () => {
  it('uses bounded operational defaults', () => {
    expect(validateEnvironment(required)).toMatchObject({
      NEW_LISTINGS_CHECKPOINT_WORKER_INTERVAL_MS: 5000,
      NEW_LISTINGS_CHECKPOINT_WORKER_BATCH_SIZE: 25,
      NEW_LISTINGS_CHECKPOINT_LEASE_DURATION_MS: 30000,
    });
  });

  it('accepts bounded custom values', () => {
    expect(
      validateEnvironment({
        ...required,
        NEW_LISTINGS_CHECKPOINT_WORKER_INTERVAL_MS: '1000',
        NEW_LISTINGS_CHECKPOINT_WORKER_BATCH_SIZE: '100',
        NEW_LISTINGS_CHECKPOINT_LEASE_DURATION_MS: '300000',
      }),
    ).toMatchObject({
      NEW_LISTINGS_CHECKPOINT_WORKER_INTERVAL_MS: 1000,
      NEW_LISTINGS_CHECKPOINT_WORKER_BATCH_SIZE: 100,
      NEW_LISTINGS_CHECKPOINT_LEASE_DURATION_MS: 300000,
    });
  });

  it.each([
    { NEW_LISTINGS_CHECKPOINT_WORKER_INTERVAL_MS: 999 },
    { NEW_LISTINGS_CHECKPOINT_WORKER_INTERVAL_MS: 60001 },
    { NEW_LISTINGS_CHECKPOINT_WORKER_BATCH_SIZE: 0 },
    { NEW_LISTINGS_CHECKPOINT_WORKER_BATCH_SIZE: 101 },
    { NEW_LISTINGS_CHECKPOINT_LEASE_DURATION_MS: 4999 },
    { NEW_LISTINGS_CHECKPOINT_LEASE_DURATION_MS: 300001 },
  ])('rejects out-of-bounds worker configuration %#', (configuration) => {
    expect(() =>
      validateEnvironment({ ...required, ...configuration }),
    ).toThrow('Invalid environment configuration');
  });
});
