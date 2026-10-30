import { assertNoUnresolvedApprovalCleanup } from '../src/modules/real-trading/infrastructure/approval-cleanup-execution-guard';
import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import {
  PrismaService,
  databaseSchema,
} from '../src/infrastructure/database/prisma.service';
import { PrismaApprovalCleanupStore } from '../src/modules/real-trading/infrastructure/prisma-approval-cleanup.store';
import {
  cleanupNow,
  cleanupPlan,
  cleanupReceipt,
} from './fixtures/approval-cleanup';
describe('Durable one-attempt approval cleanup (e2e)', () => {
  let prisma: PrismaService;
  let store: PrismaApprovalCleanupStore;
  beforeAll(async () => {
    const url = process.env.DATABASE_URL!;
    if (databaseSchema(url) !== 'crypto_trader_e2e')
      throw new Error('Isolated E2E schema required');
    prisma = new PrismaService(url);
    await prisma.onModuleInit();
    store = new PrismaApprovalCleanupStore(prisma, () => cleanupNow);
  });
  beforeEach(async () => {
    await prisma.$executeRaw`DELETE FROM approval_cleanup_obligations`;
  });
  afterAll(async () => {
    await prisma.$executeRaw`DELETE FROM approval_cleanup_obligations`;
    await prisma.onModuleDestroy();
  });
  async function ready() {
    const { record } = await store.register(cleanupPlan());
    return store.transition(record.plan.id, record.fingerprint, {
      type: 'operation_terminal',
      operationId: record.plan.operationId,
      providerOrderId: 'order123',
    });
  }
  it.each([
    'awaiting_operation',
    'ready',
    'claimed',
    'submitted',
    'unknown',
    'failed',
  ])('blocks ordinary execution with persisted %s cleanup', async (state) => {
    const { record } = await store.register(cleanupPlan());
    await prisma.$executeRaw`UPDATE approval_cleanup_obligations SET state = ${state}, record = jsonb_set(record, '{state}', ${JSON.stringify(state)}::jsonb) WHERE id = ${record.plan.id}::uuid`;
    await expect(
      prisma.$transaction((tx) => assertNoUnresolvedApprovalCleanup(tx)),
    ).rejects.toThrow('unresolved approval cleanup');
  });
  it('allows the guard when no obligation exists without granting an execution command', async () => {
    await expect(
      prisma.$transaction((tx) => assertNoUnresolvedApprovalCleanup(tx)),
    ).resolves.toBeUndefined();
  });
  it('registers idempotently and rejects changed operation scope', async () => {
    const p = cleanupPlan();
    const results = await Promise.all([store.register(p), store.register(p)]);
    expect(results.filter((r) => r.replayed)).toHaveLength(1);
    await expect(store.register({ ...p, id: randomUUID() })).rejects.toThrow();
  });
  it('prevents concurrent obligations for the same wallet', async () => {
    const p = cleanupPlan();
    const results = await Promise.allSettled([
      store.register(p),
      store.register({ ...p, id: randomUUID(), operationId: randomUUID() }),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(await store.unresolved(p.walletHash)).toHaveLength(1);
  });
  it('permits exactly one concurrent claim and retains it across instances', async () => {
    const r = await ready();
    const results = await Promise.allSettled([
      store.transition(r.plan.id, r.fingerprint, { type: 'claim' }),
      new PrismaApprovalCleanupStore(prisma).transition(
        r.plan.id,
        r.fingerprint,
        { type: 'claim' },
      ),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(
      (
        await new PrismaApprovalCleanupStore(prisma).unresolved(
          r.plan.walletHash,
        )
      )[0]?.state,
    ).toBe('claimed');
    await expect(
      store.register({
        ...r.plan,
        id: randomUUID(),
        operationId: randomUUID(),
      }),
    ).rejects.toThrow();
  });
  it('keeps ambiguous attempts consumed without retry', async () => {
    const r = await ready();
    await store.transition(r.plan.id, r.fingerprint, { type: 'claim' });
    await store.transition(r.plan.id, r.fingerprint, { type: 'ambiguous' });
    await expect(
      store.transition(r.plan.id, r.fingerprint, { type: 'claim' }),
    ).rejects.toThrow();
    expect((await store.unresolved(r.plan.walletHash))[0]?.state).toBe(
      'unknown',
    );
  });
  it('requires exact finalized evidence before releasing the wallet gate', async () => {
    const r = await ready();
    await store.transition(r.plan.id, r.fingerprint, { type: 'claim' });
    await store.transition(r.plan.id, r.fingerprint, {
      type: 'broadcast',
      transactionHash: cleanupReceipt().receipt.hash,
    });
    const invalid = cleanupReceipt();
    invalid.receipt.input = invalid.receipt.input.slice(0, -1) + '1';
    await expect(
      store.transition(r.plan.id, r.fingerprint, {
        type: 'receipt',
        evidence: invalid,
      }),
    ).rejects.toThrow();
    expect((await store.unresolved(r.plan.walletHash))[0]?.state).toBe(
      'submitted',
    );
    expect(
      (
        await store.transition(r.plan.id, r.fingerprint, {
          type: 'receipt',
          evidence: cleanupReceipt(),
        })
      ).state,
    ).toBe('cleared');
    expect(await store.unresolved(r.plan.walletHash)).toEqual([]);
    await expect(
      prisma.$transaction((tx) => assertNoUnresolvedApprovalCleanup(tx)),
    ).resolves.toBeUndefined();
    await expect(
      store.register({
        ...r.plan,
        id: randomUUID(),
        operationId: randomUUID(),
      }),
    ).resolves.toMatchObject({ replayed: false });
  });
  it('does not release the wallet gate for a failed revocation', async () => {
    const r = await ready();
    await store.transition(r.plan.id, r.fingerprint, { type: 'claim' });
    await store.transition(r.plan.id, r.fingerprint, {
      type: 'broadcast',
      transactionHash: cleanupReceipt().receipt.hash,
    });
    const e = cleanupReceipt();
    e.receipt.succeeded = false;
    await store.transition(r.plan.id, r.fingerprint, {
      type: 'receipt',
      evidence: e,
    });
    await expect(
      store.register({
        ...r.plan,
        id: randomUUID(),
        operationId: randomUUID(),
      }),
    ).rejects.toThrow();
  });
});
