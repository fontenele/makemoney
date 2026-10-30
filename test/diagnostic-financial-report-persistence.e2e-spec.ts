import 'dotenv/config';
import {
  PrismaService,
  databaseSchema,
} from '../src/infrastructure/database/prisma.service';
import { diagnosticBundle, diagnosticPlan } from './fixtures/diagnostic-report';
import {
  buildDiagnosticFinancialReport,
  diagnosticReportFingerprint,
} from '../src/modules/real-trading/application/diagnostic-financial-report';
import { PrismaDiagnosticFinancialReportStore } from '../src/modules/real-trading/infrastructure/prisma-diagnostic-financial-report.store';

describe('Immutable diagnostic report persistence (e2e)', () => {
  let prisma: PrismaService;
  let store: PrismaDiagnosticFinancialReportStore;
  const clean = async () => {
    await prisma.$executeRaw`DELETE FROM gas_diagnostic_financial_reports`;
    await prisma.$executeRaw`DELETE FROM gas_diagnostics`;
  };
  beforeAll(async () => {
    const url = process.env.DATABASE_URL!;
    if (databaseSchema(url) !== 'crypto_trader_e2e')
      throw new Error('Isolated E2E schema required');
    prisma = new PrismaService(url);
    await prisma.onModuleInit();
    store = new PrismaDiagnosticFinancialReportStore(prisma);
  });
  beforeEach(async () => {
    await clean();
    const plan = diagnosticPlan();
    await prisma.$executeRaw`INSERT INTO gas_diagnostics (id, slot, state, fingerprint, plan, expires_at, provider_order_id) VALUES (${plan.id}::uuid, 'single_btcb_gas_test', 'submitted', ${plan.fingerprint}, ${JSON.stringify(plan)}::jsonb, NOW(), '123')`;
  });
  afterAll(async () => {
    await clean();
    await prisma.onModuleDestroy();
  });
  it('records one immutable report under concurrent replay without changing submission', async () => {
    const report = buildDiagnosticFinancialReport(
      diagnosticPlan(),
      diagnosticBundle(),
    );
    const results = await Promise.all([store.save(report), store.save(report)]);
    expect(results.filter((row) => row.replayed)).toHaveLength(1);
    expect((await store.latest())?.fingerprint).toBe(report.fingerprint);
    const rows = await prisma.$queryRaw<
      Array<{ state: string }>
    >`SELECT state FROM gas_diagnostics`;
    expect(rows).toEqual([{ state: 'submitted' }]);
  });
  it('rejects changed facts instead of overwriting the first report', async () => {
    const report = buildDiagnosticFinancialReport(
      diagnosticPlan(),
      diagnosticBundle(),
    );
    await store.save(report);
    report.sourceSpentUsdt = '2';
    report.fingerprint = diagnosticReportFingerprint(report);
    await expect(store.save(report)).rejects.toThrow('cannot be rewritten');
  });
  it('detects persisted JSON tampering', async () => {
    const report = buildDiagnosticFinancialReport(
      diagnosticPlan(),
      diagnosticBundle(),
    );
    await store.save(report);
    await prisma.$executeRaw`UPDATE gas_diagnostic_financial_reports SET report = jsonb_set(report, '{sourceSpentUsdt}', '"2"'::jsonb)`;
    await expect(store.latest()).rejects.toThrow('integrity');
  });
  it('rejects a report detached from its submitted plan', async () => {
    const report = buildDiagnosticFinancialReport(
      diagnosticPlan(),
      diagnosticBundle(),
    );
    report.planFingerprint = 'b'.repeat(64);
    report.fingerprint = diagnosticReportFingerprint(report);
    await expect(store.save(report)).rejects.toThrow('submitted plan');
  });
});
