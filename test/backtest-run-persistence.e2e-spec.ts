import 'dotenv/config';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import { BacktestRunIdempotencyConflictError } from '../src/modules/backtesting/domain/backtest-run';
import { PrismaBacktestRunRepository } from '../src/modules/backtesting/infrastructure/prisma-backtest-run.repository';

const key = 'e2e-backtest-run-persistence';

describe('Backtest run persistence (e2e)', () => {
  let prisma: PrismaService;
  let repository: PrismaBacktestRunRepository;

  beforeAll(async () => {
    prisma = new PrismaService(
      process.env.DATABASE_URL ??
        'postgresql://crypto_trader:crypto_trader@localhost:5433/crypto_trader?schema=public',
    );
    await prisma.onModuleInit();
    repository = new PrismaBacktestRunRepository(prisma);
  });

  beforeEach(() =>
    prisma.backtestRun.deleteMany({ where: { idempotencyKey: key } }),
  );
  afterAll(async () => {
    await prisma.backtestRun.deleteMany({ where: { idempotencyKey: key } });
    await prisma.onModuleDestroy();
  });

  it('stores exact JSON and resolves matching concurrent-key replay', async () => {
    const value = {
      idempotencyKey: key,
      requestFingerprint: 'a'.repeat(64),
      request: { quantity: '0.001' },
      result: { totalNetReturnUsdt: '1.234567890123456789' },
    };
    const first = await repository.create(value);
    const replay = await repository.create(value);

    expect(first.replayed).toBe(false);
    expect(replay).toEqual({ run: first.run, replayed: true });
    await expect(
      prisma.backtestRun.count({ where: { idempotencyKey: key } }),
    ).resolves.toBe(1);
  });

  it('rejects conflicting idempotency-key reuse', async () => {
    const value = {
      idempotencyKey: key,
      requestFingerprint: 'a'.repeat(64),
      request: {},
      result: {},
    };
    await repository.create(value);
    await expect(
      repository.create({ ...value, requestFingerprint: 'b'.repeat(64) }),
    ).rejects.toBeInstanceOf(BacktestRunIdempotencyConflictError);
  });
});
