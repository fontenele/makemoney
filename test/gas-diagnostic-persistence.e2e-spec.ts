import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import {
  PrismaService,
  databaseSchema,
} from '../src/infrastructure/database/prisma.service';
import { PrismaGasDiagnosticStore } from '../src/modules/real-trading/infrastructure/prisma-gas-diagnostic.store';
import { GasDiagnosticPlan } from '../src/modules/real-trading/application/gas-diagnostic-store';

describe('Gas diagnostic durable reservation (e2e)', () => {
  let prisma: PrismaService;
  let store: PrismaGasDiagnosticStore;
  const stopId = 'gas-diagnostic-test-stop';
  const plan = (): GasDiagnosticPlan => ({
    id: randomUUID(),
    fingerprint: 'a'.repeat(64),
    walletHash: 'b'.repeat(64),
    expectedBtcb: '0.00001',
    minimumBtcb: '0.00000995',
    slippageRate: '0.005',
    nativeBnbAtRisk: '0.005',
    referenceBnbUsdt: '700',
    networkBudgetUsdt: '0.5',
    maximumPotentialLossUsdt: '4.5',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 180000).toISOString(),
  });
  beforeAll(async () => {
    const url = process.env.DATABASE_URL!;
    if (databaseSchema(url) !== 'crypto_trader_e2e')
      throw new Error(
        'Diagnostic persistence tests require the isolated E2E schema',
      );
    prisma = new PrismaService(url);
    await prisma.onModuleInit();
    store = new PrismaGasDiagnosticStore(prisma);
  });
  beforeEach(async () => {
    await prisma.$executeRaw`DELETE FROM gas_diagnostics`;
    await prisma.riskControlEvent.deleteMany({ where: { id: stopId } });
  });
  afterAll(async () => {
    await prisma.$executeRaw`DELETE FROM gas_diagnostics`;
    await prisma.riskControlEvent.deleteMany({ where: { id: stopId } });
    await prisma.onModuleDestroy();
  });
  it('permits one concurrent claim and preserves the consumed slot across instances', async () => {
    const facts = plan();
    await store.prepare(facts);
    const results = await Promise.allSettled([
      store.claim(facts.id, facts.fingerprint),
      new PrismaGasDiagnosticStore(prisma).claim(facts.id, facts.fingerprint),
    ]);
    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    await expect(store.read(facts.id)).resolves.toMatchObject({
      state: 'claimed',
    });
    await expect(store.prepare(plan())).rejects.toThrow();
    await store.recordOutcome(facts.id, null);
    await expect(
      new PrismaGasDiagnosticStore(prisma).read(facts.id),
    ).resolves.toMatchObject({ state: 'unknown' });
    await expect(store.claim(facts.id, facts.fingerprint)).rejects.toThrow();
  });
  it('invalidates old plan ids when preparation is replaced', async () => {
    const old = plan();
    const next = plan();
    await store.prepare(old);
    await store.prepare(next);
    await expect(store.claim(old.id, old.fingerprint)).rejects.toThrow();
    await expect(store.read(next.id)).resolves.toMatchObject({
      state: 'prepared',
    });
  });
  it('persists the full supported provider order identity after a durable claim', async () => {
    const facts = plan();
    await store.prepare(facts);
    await store.claim(facts.id, facts.fingerprint);
    const orderId = 'a'.repeat(256);
    await store.recordOutcome(facts.id, orderId);
    await expect(store.read(facts.id)).resolves.toMatchObject({
      state: 'submitted',
      providerOrderId: orderId,
    });
  });
  it('rejects an expired plan and a changed fingerprint', async () => {
    const facts = plan();
    facts.expiresAt = new Date(Date.now() - 1).toISOString();
    await store.prepare(facts);
    await expect(store.claim(facts.id, facts.fingerprint)).rejects.toThrow();
    const next = plan();
    await store.prepare(next);
    await expect(store.claim(next.id, 'c'.repeat(64))).rejects.toThrow();
  });
  it('rechecks persisted emergency stop at claim time', async () => {
    const facts = plan();
    await store.prepare(facts);
    await prisma.riskControlEvent.create({
      data: {
        id: stopId,
        control: 'emergency_stop',
        active: true,
        reason: 'test-only stop',
        changedAt: new Date(),
      },
    });
    await expect(store.claim(facts.id, facts.fingerprint)).rejects.toThrow(
      'Emergency stop',
    );
  });
});
