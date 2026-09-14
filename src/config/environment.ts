import Joi from 'joi';

interface Environment {
  NODE_ENV: 'development' | 'test' | 'production';
  PORT: number;
  DATABASE_URL: string;
  REDIS_URL: string;
  BINANCE_WS_BASE_URL: string;
  BINANCE_REST_BASE_URL: string;
  NEW_LISTINGS_POLL_INTERVAL_MS: number;
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
}

const environmentSchema = Joi.object<Environment>({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().port().default(3000),
  DATABASE_URL: Joi.string().uri().required(),
  REDIS_URL: Joi.string().uri().required(),
  BINANCE_WS_BASE_URL: Joi.string()
    .uri({ scheme: ['wss'] })
    .default('wss://stream.binance.com:9443'),
  BINANCE_REST_BASE_URL: Joi.string()
    .uri({ scheme: ['https'] })
    .default('https://data-api.binance.vision'),
  NEW_LISTINGS_POLL_INTERVAL_MS: Joi.number()
    .integer()
    .min(5000)
    .default(60000),
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
    .pattern(/^[1-9]\d{0,19}(\.\d{1,18})?$/)
    .default('100'),
  RISK_EMERGENCY_STOP: Joi.boolean().default(false),
  RISK_MAX_BTC_POSITION_QUANTITY: Joi.string()
    .pattern(/^[1-9]\d{0,19}(\.\d{1,18})?$/)
    .default('0.01'),
  RISK_MAX_DAILY_REALIZED_LOSS_USDT: Joi.string()
    .pattern(/^[1-9]\d{0,19}(\.\d{1,18})?$/)
    .default('25'),
  RISK_MAX_UNREALIZED_LOSS_USDT: Joi.string()
    .pattern(/^[1-9]\d{0,19}(\.\d{1,18})?$/)
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
})
  .custom((value: Environment, helpers) => {
    if (value.STRATEGY_MA_SHORT_PERIOD >= value.STRATEGY_MA_LONG_PERIOD) {
      return helpers.message({
        custom:
          'STRATEGY_MA_SHORT_PERIOD must be less than STRATEGY_MA_LONG_PERIOD',
      });
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
