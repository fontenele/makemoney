import { databaseSchema } from './prisma.service';

describe('databaseSchema', () => {
  it('reads the schema selected in the PostgreSQL URL', () => {
    expect(
      databaseSchema(
        'postgresql://user:password@localhost:5433/database?schema=crypto_trader_e2e',
      ),
    ).toBe('crypto_trader_e2e');
  });

  it('uses the adapter default when no schema is selected', () => {
    expect(
      databaseSchema('postgresql://user:password@localhost:5433/database'),
    ).toBeUndefined();
  });

  it('rejects a schema that is unsafe for the connection search path', () => {
    expect(() =>
      databaseSchema(
        'postgresql://user:password@localhost:5433/database?schema=invalid%3Bdrop',
      ),
    ).toThrow('Invalid PostgreSQL schema name');
  });
});
