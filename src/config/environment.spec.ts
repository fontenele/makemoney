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

describe('validateEnvironment real execution', () => {
  it('defaults both activation gates off with no approved instrument', () => {
    expect(validateEnvironment(required)).toMatchObject({
      TRADING_MODE: 'paper',
      REAL_EXECUTION_ENABLED: false,
      REAL_EXECUTION_APPROVED_PROVIDER_ID: null,
      REAL_EXECUTION_APPROVED_CHAIN_ID: null,
      REAL_EXECUTION_APPROVED_SOURCE_TOKEN_ADDRESS: null,
      REAL_EXECUTION_APPROVED_TARGET_TOKEN_ADDRESS: null,
      REAL_EXECUTION_CAPABILITY_MAX_AGE_MS: 10000,
    });
  });

  it('accepts explicit independent gates and a complete exact allowlist', () => {
    expect(
      validateEnvironment({
        ...required,
        TRADING_MODE: 'real',
        REAL_EXECUTION_ENABLED: 'true',
        REAL_EXECUTION_APPROVED_PROVIDER_ID: 'agentic_wallet',
        REAL_EXECUTION_APPROVED_CHAIN_ID: '56',
        REAL_EXECUTION_APPROVED_SOURCE_TOKEN_ADDRESS: '0xsource',
        REAL_EXECUTION_APPROVED_TARGET_TOKEN_ADDRESS: '0xtarget',
        REAL_EXECUTION_CAPABILITY_MAX_AGE_MS: '5000',
      }),
    ).toMatchObject({
      TRADING_MODE: 'real',
      REAL_EXECUTION_ENABLED: true,
      REAL_EXECUTION_APPROVED_CHAIN_ID: '56',
      REAL_EXECUTION_CAPABILITY_MAX_AGE_MS: 5000,
    });
  });

  it('rejects simultaneous activation without a complete allowlist', () => {
    expect(() =>
      validateEnvironment({
        ...required,
        TRADING_MODE: 'real',
        REAL_EXECUTION_ENABLED: 'true',
      }),
    ).toThrow('real execution requires explicit provider');
  });

  it('rejects equal approved token identities and ambiguous gates', () => {
    expect(() =>
      validateEnvironment({
        ...required,
        TRADING_MODE: 'real',
        REAL_EXECUTION_ENABLED: true,
        REAL_EXECUTION_APPROVED_PROVIDER_ID: 'agentic_wallet',
        REAL_EXECUTION_APPROVED_CHAIN_ID: '56',
        REAL_EXECUTION_APPROVED_SOURCE_TOKEN_ADDRESS: '0xsame',
        REAL_EXECUTION_APPROVED_TARGET_TOKEN_ADDRESS: '0xsame',
      }),
    ).toThrow('approved token addresses must be distinct');
    expect(() =>
      validateEnvironment({ ...required, REAL_EXECUTION_ENABLED: 'yes' }),
    ).toThrow('Invalid environment configuration');
  });
});

describe('validateEnvironment Polymarket public API', () => {
  it('uses the official Gamma API default', () => {
    expect(validateEnvironment(required)).toMatchObject({
      POLYMARKET_ENABLED: false,
      POLYMARKET_GAMMA_BASE_URL: 'https://gamma-api.polymarket.com',
      POLYMARKET_CLOB_BASE_URL: 'https://clob.polymarket.com',
      POLYMARKET_DATA_BASE_URL: 'https://data-api.polymarket.com',
    });
  });

  it('accepts explicit Polymarket enablement', () => {
    expect(
      validateEnvironment({ ...required, POLYMARKET_ENABLED: 'true' }),
    ).toMatchObject({ POLYMARKET_ENABLED: true });
  });

  it.each(['1', 'yes', 'enabled'])(
    'rejects ambiguous Polymarket enablement %s',
    (value) => {
      expect(() =>
        validateEnvironment({ ...required, POLYMARKET_ENABLED: value }),
      ).toThrow('Invalid environment configuration');
    },
  );

  it('accepts a custom HTTPS endpoint and rejects HTTP', () => {
    expect(
      validateEnvironment({
        ...required,
        POLYMARKET_GAMMA_BASE_URL: 'https://gamma-api.example.com',
      }),
    ).toMatchObject({
      POLYMARKET_GAMMA_BASE_URL: 'https://gamma-api.example.com',
    });
    expect(() =>
      validateEnvironment({
        ...required,
        POLYMARKET_GAMMA_BASE_URL: 'http://gamma-api.example.com',
      }),
    ).toThrow('Invalid environment configuration');
  });

  it('accepts a custom HTTPS CLOB endpoint and rejects HTTP', () => {
    expect(
      validateEnvironment({
        ...required,
        POLYMARKET_CLOB_BASE_URL: 'https://clob.example.com',
      }),
    ).toMatchObject({
      POLYMARKET_CLOB_BASE_URL: 'https://clob.example.com',
    });
    expect(() =>
      validateEnvironment({
        ...required,
        POLYMARKET_CLOB_BASE_URL: 'http://clob.example.com',
      }),
    ).toThrow('Invalid environment configuration');
  });

  it('accepts a custom HTTPS Data API endpoint and rejects HTTP', () => {
    expect(
      validateEnvironment({
        ...required,
        POLYMARKET_DATA_BASE_URL: 'https://data-api.example.com',
      }),
    ).toMatchObject({
      POLYMARKET_DATA_BASE_URL: 'https://data-api.example.com',
    });
    expect(() =>
      validateEnvironment({
        ...required,
        POLYMARKET_DATA_BASE_URL: 'http://data-api.example.com',
      }),
    ).toThrow('Invalid environment configuration');
  });
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
      NEW_LISTINGS_CHECKPOINT_WORKER_ENABLED: false,
      NEW_LISTINGS_CHECKPOINT_WORKER_INTERVAL_MS: 5000,
      NEW_LISTINGS_CHECKPOINT_WORKER_BATCH_SIZE: 25,
      NEW_LISTINGS_CHECKPOINT_LEASE_DURATION_MS: 30000,
    });
  });

  it('accepts bounded custom values', () => {
    expect(
      validateEnvironment({
        ...required,
        NEW_LISTINGS_CHECKPOINT_WORKER_ENABLED: 'true',
        NEW_LISTINGS_CHECKPOINT_WORKER_INTERVAL_MS: '1000',
        NEW_LISTINGS_CHECKPOINT_WORKER_BATCH_SIZE: '100',
        NEW_LISTINGS_CHECKPOINT_LEASE_DURATION_MS: '300000',
      }),
    ).toMatchObject({
      NEW_LISTINGS_CHECKPOINT_WORKER_ENABLED: true,
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
