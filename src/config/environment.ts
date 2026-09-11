import Joi from 'joi';

interface Environment {
  NODE_ENV: 'development' | 'test' | 'production';
  PORT: number;
  DATABASE_URL: string;
  REDIS_URL: string;
  BINANCE_WS_BASE_URL: string;
  BINANCE_REST_BASE_URL: string;
  PAPER_INITIAL_USDT_BALANCE: string;
  PAPER_VALUATION_MAX_PRICE_AGE_MS: number;
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
  PAPER_INITIAL_USDT_BALANCE: Joi.string()
    .pattern(/^(0|[1-9]\d{0,19})(\.\d{1,18})?$/)
    .default('1000'),
  PAPER_VALUATION_MAX_PRICE_AGE_MS: Joi.number()
    .integer()
    .positive()
    .default(10000),
}).unknown(true);

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
