import 'dotenv/config';

import { PrismaService } from '../src/infrastructure/database/prisma.service';

describe('Funding conversion persistence schema (e2e)', () => {
  let prisma: PrismaService;

  beforeAll(async () => {
    prisma = new PrismaService(process.env.DATABASE_URL ?? '');
    await prisma.onModuleInit();
  });

  afterAll(async () => {
    await prisma.onModuleDestroy();
  });

  it('stores the complete terminal pending-reconciliation state', async () => {
    const rows = await prisma.$queryRaw<
      { characterMaximumLength: number | null }[]
    >`
      SELECT character_maximum_length AS "characterMaximumLength"
      FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND table_name = 'agentic_wallet_funding_conversion_submission_attempts'
        AND column_name = 'state'
    `;

    expect(rows).toEqual([{ characterMaximumLength: 64 }]);
    expect(
      'provider_finished_pending_financial_reconciliation'.length,
    ).toBeLessThanOrEqual(rows[0]?.characterMaximumLength ?? 0);
  });
});
