import { validateEnvironment } from './environment';

const required = {
  DATABASE_URL: 'postgresql://user:password@localhost:5433/database',
  REDIS_URL: 'redis://localhost:6379',
};

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
