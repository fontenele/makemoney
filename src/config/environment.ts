import Joi from 'joi';

interface Environment {
  NODE_ENV: 'development' | 'test' | 'production';
  PORT: number;
  API_BIND_HOST: '127.0.0.1';
  DATABASE_URL: string;
  REDIS_URL: string;
  BINANCE_WS_BASE_URL: string;
  BINANCE_REST_BASE_URL: string;
  POLYMARKET_ENABLED: boolean;
  POLYMARKET_GAMMA_BASE_URL: string;
  POLYMARKET_CLOB_BASE_URL: string;
  POLYMARKET_DATA_BASE_URL: string;
  NEW_LISTINGS_POLL_INTERVAL_MS: number;
  NEW_LISTINGS_CHECKPOINT_WORKER_ENABLED: boolean;
  NEW_LISTINGS_CHECKPOINT_WORKER_INTERVAL_MS: number;
  NEW_LISTINGS_CHECKPOINT_WORKER_BATCH_SIZE: number;
  NEW_LISTINGS_CHECKPOINT_LEASE_DURATION_MS: number;
  PAPER_INITIAL_USDT_BALANCE: string;
  PAPER_VALUATION_MAX_PRICE_AGE_MS: number;
  PAPER_QUOTE_MAX_MARKET_DATA_AGE_MS: number;
  PAPER_TAKER_FEE_RATE: string;
  RISK_MAX_ORDER_NOTIONAL_USDT: string;
  RISK_EMERGENCY_STOP: boolean;
  RISK_MAX_BTC_POSITION_QUANTITY: string;
  RISK_MAX_DAILY_REALIZED_LOSS_USDT: string;
  RISK_MAX_UNREALIZED_LOSS_USDT: string;
  RISK_MAX_TOP_OF_BOOK_PARTICIPATION_RATE: string;
  RISK_CONTROL_TOKEN_SHA256?: string;
  RISK_MAX_EXECUTIONS_PER_WINDOW: number;
  RISK_EXECUTION_WINDOW_MS: number;
  STRATEGY_MA_SHORT_PERIOD: number;
  STRATEGY_MA_LONG_PERIOD: number;
  TRADING_MODE: 'paper' | 'real';
  REAL_EXECUTION_ENABLED: boolean;
  REAL_EXECUTION_APPROVED_PROVIDER_ID: string | null;
  REAL_EXECUTION_APPROVED_CHAIN_ID: string | null;
  REAL_EXECUTION_APPROVED_SOURCE_TOKEN_ADDRESS: string | null;
  REAL_EXECUTION_APPROVED_TARGET_TOKEN_ADDRESS: string | null;
  REAL_EXECUTION_CAPABILITY_MAX_AGE_MS: number;
  REAL_RISK_MAX_ORDER_NOTIONAL_USDT: string | null;
  REAL_RISK_MAX_DAILY_SPEND_USDT: string | null;
  REAL_RISK_MAX_BANKROLL_USDT: string | null;
  REAL_RISK_MAX_PROVIDER_FEE_RATE: string | null;
  REAL_RISK_MAX_NETWORK_FEE_USDT: string | null;
  REAL_RISK_MAX_SLIPPAGE_RATE: string | null;
}

const positiveDecimalPattern =
  /^(?:[1-9]\d{0,19}(?:\.\d{1,18})?|0\.(?=\d{0,17}[1-9])\d{1,18})$/;

const environmentSchema = Joi.object<Environment>({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  API_BIND_HOST: Joi.string().valid('127.0.0.1').default('127.0.0.1'),
  DATABASE_URL: Joi.string().uri().required(),
  REDIS_URL: Joi.string().uri().required(),
  BINANCE_WS_BASE_URL: Joi.string()
    .uri({ scheme: ['wss'] })
    .default('wss://stream.binance.com:9443'),
  BINANCE_REST_BASE_URL: Joi.string()
    .uri({ scheme: ['https'] })
    .default('https://data-api.binance.vision'),
  POLYMARKET_ENABLED: Joi.boolean().default(false),
  POLYMARKET_GAMMA_BASE_URL: Joi.string()
    .uri({ scheme: ['https'] })
    .default('https://gamma-api.polymarket.com'),
  POLYMARKET_CLOB_BASE_URL: Joi.string()
    .uri({ scheme: ['https'] })
    .default('https://clob.polymarket.com'),
  POLYMARKET_DATA_BASE_URL: Joi.string()
    .uri({ scheme: ['https'] })
    .default('https://data-api.polymarket.com'),
  NEW_LISTINGS_POLL_INTERVAL_MS: Joi.number()
    .integer()
    .min(5000)
    .default(60000),
  NEW_LISTINGS_CHECKPOINT_WORKER_ENABLED: Joi.boolean().default(false),
  NEW_LISTINGS_CHECKPOINT_WORKER_INTERVAL_MS: Joi.number()
    .integer()
    .min(1000)
    .max(60000)
    .default(5000),
  NEW_LISTINGS_CHECKPOINT_WORKER_BATCH_SIZE: Joi.number()
    .integer()
    .min(1)
    .max(100)
    .default(25),
  NEW_LISTINGS_CHECKPOINT_LEASE_DURATION_MS: Joi.number()
    .integer()
    .min(5000)
    .max(300000)
    .default(30000),
  PAPER_INITIAL_USDT_BALANCE: Joi.string()
    .pattern(/^(0|[1-9]\d{0,19})(\.\d{1,18})?$/)
    .default('1000'),
  PAPER_VALUATION_MAX_PRICE_AGE_MS: Joi.number()
    .integer()
    .positive()
    .default(10000),
  PAPER_QUOTE_MAX_MARKET_DATA_AGE_MS: Joi.number()
    .integer()
    .positive()
    .default(10000),
  PAPER_TAKER_FEE_RATE: Joi.string()
    .pattern(/^(0|0\.\d+)$/)
    .default('0.001'),
  RISK_MAX_ORDER_NOTIONAL_USDT: Joi.string()
    .pattern(positiveDecimalPattern)
    .default('100'),
  RISK_EMERGENCY_STOP: Joi.boolean().default(false),
  RISK_MAX_BTC_POSITION_QUANTITY: Joi.string()
    .pattern(positiveDecimalPattern)
    .default('0.01'),
  RISK_MAX_DAILY_REALIZED_LOSS_USDT: Joi.string()
    .pattern(positiveDecimalPattern)
    .default('25'),
  RISK_MAX_UNREALIZED_LOSS_USDT: Joi.string()
    .pattern(positiveDecimalPattern)
    .default('25'),
  RISK_MAX_TOP_OF_BOOK_PARTICIPATION_RATE: Joi.string()
    .pattern(/^(0\.\d*[1-9]\d*|1(?:\.0+)?)$/)
    .default('0.10'),
  RISK_CONTROL_TOKEN_SHA256: Joi.string()
    .empty('')
    .pattern(/^[a-fA-F0-9]{64}$/)
    .optional(),
  RISK_MAX_EXECUTIONS_PER_WINDOW: Joi.number().integer().positive().default(10),
  RISK_EXECUTION_WINDOW_MS: Joi.number().integer().positive().default(60000),
  STRATEGY_MA_SHORT_PERIOD: Joi.number().integer().min(1).max(1000).default(3),
  STRATEGY_MA_LONG_PERIOD: Joi.number().integer().min(1).max(1000).default(5),
  TRADING_MODE: Joi.string().valid('paper', 'real').default('paper'),
  REAL_EXECUTION_ENABLED: Joi.boolean().default(false),
  REAL_EXECUTION_APPROVED_PROVIDER_ID: Joi.string()
    .pattern(/^[a-z][a-z0-9_-]{0,31}$/)
    .empty('')
    .default(null),
  REAL_EXECUTION_APPROVED_CHAIN_ID: Joi.string()
    .pattern(/^[A-Za-z0-9_-]{1,32}$/)
    .empty('')
    .default(null),
  REAL_EXECUTION_APPROVED_SOURCE_TOKEN_ADDRESS: Joi.string()
    .pattern(/^\S{1,256}$/)
    .empty('')
    .default(null),
  REAL_EXECUTION_APPROVED_TARGET_TOKEN_ADDRESS: Joi.string()
    .pattern(/^\S{1,256}$/)
    .empty('')
    .default(null),
  REAL_EXECUTION_CAPABILITY_MAX_AGE_MS: Joi.number()
    .integer()
    .min(1000)
    .max(60000)
    .default(10000),
  REAL_RISK_MAX_ORDER_NOTIONAL_USDT: Joi.string()
    .pattern(positiveDecimalPattern)
    .empty('')
    .default(null),
  REAL_RISK_MAX_DAILY_SPEND_USDT: Joi.string()
    .pattern(positiveDecimalPattern)
    .empty('')
    .default(null),
  REAL_RISK_MAX_BANKROLL_USDT: Joi.string()
    .pattern(positiveDecimalPattern)
    .empty('')
    .default(null),
  REAL_RISK_MAX_PROVIDER_FEE_RATE: Joi.string()
    .pattern(/^(?:0|0\.\d*[1-9]\d*|1(?:\.0+)?)$/)
    .empty('')
    .default(null),
  REAL_RISK_MAX_NETWORK_FEE_USDT: Joi.string()
    .pattern(positiveDecimalPattern)
    .empty('')
    .default(null),
  REAL_RISK_MAX_SLIPPAGE_RATE: Joi.string()
    .pattern(/^(?:0|0\.\d*[1-9]\d*|1(?:\.0+)?)$/)
    .empty('')
    .default(null),
})
  .custom((value: Environment, helpers) => {
    if (value.STRATEGY_MA_SHORT_PERIOD >= value.STRATEGY_MA_LONG_PERIOD) {
      return helpers.message({
        custom:
          'STRATEGY_MA_SHORT_PERIOD must be less than STRATEGY_MA_LONG_PERIOD',
      });
    }
    if (value.TRADING_MODE === 'real' && value.REAL_EXECUTION_ENABLED) {
      const approvals = [
        value.REAL_EXECUTION_APPROVED_PROVIDER_ID,
        value.REAL_EXECUTION_APPROVED_CHAIN_ID,
        value.REAL_EXECUTION_APPROVED_SOURCE_TOKEN_ADDRESS,
        value.REAL_EXECUTION_APPROVED_TARGET_TOKEN_ADDRESS,
      ];
      if (approvals.some((approval) => approval === null)) {
        return helpers.message({
          custom:
            'real execution requires explicit provider, chain, source-token, and target-token approvals',
        });
      }
      if (
        value.REAL_EXECUTION_APPROVED_SOURCE_TOKEN_ADDRESS ===
        value.REAL_EXECUTION_APPROVED_TARGET_TOKEN_ADDRESS
      ) {
        return helpers.message({
          custom: 'real execution approved token addresses must be distinct',
        });
      }
    }
    return value;
  }, 'moving-average period relationship')
  .unknown(true);

export function validateEnvironment(
  config: Record<string, unknown>,
): Environment {
  const result = environmentSchema.validate(config, {
    abortEarly: false,
    convert: true,
  });

  if (result.error) {
    throw new Error(
      `Invalid environment configuration: ${result.error.message}`,
    );
  }

  return result.value;
}
