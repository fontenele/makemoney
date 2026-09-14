const E2E_SCHEMA = 'crypto_trader_e2e';

function configureE2eDatabaseUrl() {
  require('dotenv').config();
  const value = process.env.DATABASE_URL;
  if (!value) {
    throw new Error('DATABASE_URL is required for E2E tests');
  }
  const url = new URL(value);
  url.searchParams.set('schema', E2E_SCHEMA);
  process.env.DATABASE_URL = url.toString();
  return process.env.DATABASE_URL;
}

module.exports = { E2E_SCHEMA, configureE2eDatabaseUrl };
