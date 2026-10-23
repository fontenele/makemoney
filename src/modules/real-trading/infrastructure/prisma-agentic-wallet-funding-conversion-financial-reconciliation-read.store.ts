import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  AgenticWalletFundingConversionFinancialReconciliationAttemptReadStore,
  AgenticWalletFundingConversionFinancialReconciliationReadStore,
  AgenticWalletFundingConversionFinancialReconciliationStatusObservationReadStore,
  FundingConversionFinancialReconciliationAttemptIdentityError,
  FundingConversionFinancialReconciliationIdentityError,
  FundingConversionFinancialReconciliationStatusObservationIdentityError,
  StoredFundingConversionFinancialReconciliation,
} from '../application/agentic-wallet-funding-conversion-financial-reconciliation.store';
import { mapPersistedFundingConversionFinancialReconciliation } from './prisma-agentic-wallet-funding-conversion-financial-reconciliation.store';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export class PrismaAgenticWalletFundingConversionFinancialReconciliationReadStore
  implements
    AgenticWalletFundingConversionFinancialReconciliationReadStore,
    AgenticWalletFundingConversionFinancialReconciliationAttemptReadStore,
    AgenticWalletFundingConversionFinancialReconciliationStatusObservationReadStore
{
  constructor(private readonly prisma: PrismaService) {}

  async getByReconciliationId(
    reconciliationId: string,
  ): Promise<StoredFundingConversionFinancialReconciliation | null> {
    if (
      typeof reconciliationId !== 'string' ||
      !UUID_PATTERN.test(reconciliationId)
    )
      throw new FundingConversionFinancialReconciliationIdentityError();

    const row =
      await this.prisma.agenticWalletFundingConversionFinancialReconciliation.findUnique(
        { where: { id: reconciliationId } },
      );
    if (row === null) return null;
    const reconciliation =
      mapPersistedFundingConversionFinancialReconciliation(row);
    if (reconciliation.id !== reconciliationId)
      throw new Error(
        'Persisted funding conversion financial reconciliation identity diverges',
      );
    return reconciliation;
  }

  async getByAttemptId(
    attemptId: string,
  ): Promise<StoredFundingConversionFinancialReconciliation | null> {
    if (typeof attemptId !== 'string' || !UUID_PATTERN.test(attemptId))
      throw new FundingConversionFinancialReconciliationAttemptIdentityError();

    const row =
      await this.prisma.agenticWalletFundingConversionFinancialReconciliation.findUnique(
        { where: { attemptId } },
      );
    if (row === null) return null;
    const reconciliation =
      mapPersistedFundingConversionFinancialReconciliation(row);
    if (reconciliation.attemptId !== attemptId)
      throw new Error(
        'Persisted funding conversion financial reconciliation attempt identity diverges',
      );
    return reconciliation;
  }

  async getByStatusObservationId(
    statusObservationId: string,
  ): Promise<StoredFundingConversionFinancialReconciliation | null> {
    if (
      typeof statusObservationId !== 'string' ||
      !UUID_PATTERN.test(statusObservationId)
    )
      throw new FundingConversionFinancialReconciliationStatusObservationIdentityError();

    const row =
      await this.prisma.agenticWalletFundingConversionFinancialReconciliation.findUnique(
        { where: { statusObservationId } },
      );
    if (row === null) return null;
    const reconciliation =
      mapPersistedFundingConversionFinancialReconciliation(row);
    if (reconciliation.evidence.statusObservationId !== statusObservationId)
      throw new Error(
        'Persisted funding conversion financial reconciliation status observation identity diverges',
      );
    return reconciliation;
  }
}
