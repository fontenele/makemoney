import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  AgenticWalletAccountingLedgerBalance,
  AgenticWalletAccountingLedgerSnapshot,
  assessAgenticWalletAccountingLedgerSnapshot,
} from './agentic-wallet-accounting-ledger-snapshot';
import {
  AgenticWalletAccountingLedgerSnapshotIdentityError,
  AgenticWalletAccountingLedgerSnapshotInconsistentError,
  AgenticWalletAccountingLedgerSnapshotReadStore,
} from './agentic-wallet-accounting-ledger-snapshot.store';
import { mapPersistedAgenticWalletAccountingBalanceInitialization } from './prisma-agentic-wallet-accounting-balance-initialization.store';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

type BalanceRow = {
  assetIdentity: string;
  assetType: string;
  assetAddress: string | null;
  assetSymbol: string | null;
  quantity: string;
  updatedAt: Date;
};

export class PrismaAgenticWalletAccountingLedgerSnapshotReadStore implements AgenticWalletAccountingLedgerSnapshotReadStore {
  constructor(private readonly prisma: PrismaService) {}

  async getByInitializationId(
    initializationId: string,
    evaluatedAt: Date,
  ): Promise<AgenticWalletAccountingLedgerSnapshot | null> {
    if (
      typeof initializationId !== 'string' ||
      !UUID_PATTERN.test(initializationId) ||
      !(evaluatedAt instanceof Date) ||
      !Number.isFinite(evaluatedAt.getTime())
    )
      throw new AgenticWalletAccountingLedgerSnapshotIdentityError();

    return this.prisma.$transaction(
      async (tx) => {
        const initialization =
          await tx.realExecutionAccountingBalanceInitialization.findUnique({
            where: { id: initializationId },
          });
        if (initialization === null) return null;

        let initialized;
        try {
          initialized =
            mapPersistedAgenticWalletAccountingBalanceInitialization(
              initialization,
            );
        } catch {
          throw new AgenticWalletAccountingLedgerSnapshotInconsistentError();
        }
        if (initialized.initialization.initializationId !== initializationId)
          throw new AgenticWalletAccountingLedgerSnapshotInconsistentError();

        const rows = await tx.realExecutionAccountingBalance.findMany({
          orderBy: { assetIdentity: 'asc' },
        });
        const balances = rows.map(mapBalance);
        const assessment = assessAgenticWalletAccountingLedgerSnapshot(
          initialized,
          balances,
          evaluatedAt,
        );
        if (assessment.snapshot === null)
          throw new AgenticWalletAccountingLedgerSnapshotInconsistentError();
        return assessment.snapshot;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
  }
}

function mapBalance(row: BalanceRow): AgenticWalletAccountingLedgerBalance {
  const expectedIdentity =
    row.assetType === 'token'
      ? `token:${row.assetAddress ?? ''}`
      : row.assetType === 'native'
        ? `native:${row.assetSymbol ?? ''}`
        : '';
  if (row.assetIdentity !== expectedIdentity)
    throw new AgenticWalletAccountingLedgerSnapshotInconsistentError();

  return {
    ...(row.assetType === 'token'
      ? { assetType: 'token' as const, assetAddress: row.assetAddress ?? '' }
      : {
          assetType: row.assetType as 'native',
          assetSymbol: row.assetSymbol as 'BNB',
        }),
    currentQuantity: row.quantity,
    updatedAt: new Date(row.updatedAt),
  };
}
