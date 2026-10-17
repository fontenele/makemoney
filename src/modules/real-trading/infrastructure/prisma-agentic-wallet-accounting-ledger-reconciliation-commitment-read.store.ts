import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  AgenticWalletAccountingLedgerReconciliationCommitmentIdentityError,
  AgenticWalletAccountingLedgerReconciliationCommitmentReadStore,
  StoredAgenticWalletAccountingLedgerReconciliationCommitment,
} from './agentic-wallet-accounting-ledger-reconciliation-commitment.store';
import { mapPersistedAgenticWalletAccountingLedgerReconciliationCommitment } from './prisma-agentic-wallet-accounting-ledger-reconciliation-commitment.store';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export class PrismaAgenticWalletAccountingLedgerReconciliationCommitmentReadStore implements AgenticWalletAccountingLedgerReconciliationCommitmentReadStore {
  constructor(private readonly prisma: PrismaService) {}

  async getByReconciliationId(
    reconciliationId: string,
  ): Promise<StoredAgenticWalletAccountingLedgerReconciliationCommitment | null> {
    if (
      typeof reconciliationId !== 'string' ||
      !UUID_PATTERN.test(reconciliationId)
    )
      throw new AgenticWalletAccountingLedgerReconciliationCommitmentIdentityError();

    const row =
      await this.prisma.realExecutionAccountingLedgerReconciliation.findUnique({
        where: { id: reconciliationId },
      });
    if (row === null) return null;
    const stored =
      mapPersistedAgenticWalletAccountingLedgerReconciliationCommitment(row);
    if (stored.commitment.reconciliationId !== reconciliationId)
      throw new Error(
        'Persisted accounting ledger reconciliation commitment identity diverges',
      );
    return stored;
  }
}
