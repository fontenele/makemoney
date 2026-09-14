const { execFileSync } = require('node:child_process');
const path = require('node:path');
const { Client } = require('pg');
const {
  E2E_SCHEMA,
  configureE2eDatabaseUrl,
} = require('./e2e-environment.cjs');

module.exports = async function globalSetup() {
  const databaseUrl = configureE2eDatabaseUrl();
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    await client.query(`DROP SCHEMA IF EXISTS "${E2E_SCHEMA}" CASCADE`);
    await client.query(`CREATE SCHEMA "${E2E_SCHEMA}"`);
  } finally {
    await client.end();
  }

  execFileSync(
    process.execPath,
    [path.resolve('node_modules/prisma/build/index.js'), 'migrate', 'deploy'],
    {
      cwd: path.resolve('.'),
      env: { ...process.env, DATABASE_URL: databaseUrl },
      stdio: 'inherit',
    },
  );
};
