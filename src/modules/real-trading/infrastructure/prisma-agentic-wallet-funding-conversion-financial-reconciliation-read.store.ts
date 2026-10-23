import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  AgenticWalletFundingConversionFinancialReconciliationAttemptReadStore,
  AgenticWalletFundingConversionFinancialReconciliationPlanReadStore,
  AgenticWalletFundingConversionFinancialReconciliationProviderOrderReadStore,
  AgenticWalletFundingConversionFinancialReconciliationReadStore,
  AgenticWalletFundingConversionFinancialReconciliationRequestFingerprintReadStore,
  AgenticWalletFundingConversionFinancialReconciliationStatusObservationReadStore,
  AgenticWalletFundingConversionFinancialReconciliationTransactionReadStore,
  FundingConversionFinancialReconciliationAttemptIdentityError,
  FundingConversionFinancialReconciliationIdentityError,
  FundingConversionFinancialReconciliationPlanIdentityError,
  FundingConversionFinancialReconciliationProviderOrderIdentityError,
  FundingConversionFinancialReconciliationRequestFingerprintIdentityError,
  FundingConversionFinancialReconciliationStatusObservationIdentityError,
  FundingConversionFinancialReconciliationTransactionIdentityError,
  StoredFundingConversionFinancialReconciliation,
} from '../application/agentic-wallet-funding-conversion-financial-reconciliation.store';
import { isCanonicalFundingConversionTransactionHash } from './agentic-wallet-funding-conversion-status-response';
import { isSafeAgenticWalletProviderOrderId } from './agentic-wallet-market-swap-submission-response';
import {
  isCanonicalFundingConversionFinancialReconciliationRequestFingerprint,
  mapPersistedFundingConversionFinancialReconciliation,
} from './prisma-agentic-wallet-funding-conversion-financial-reconciliation.store';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export class PrismaAgenticWalletFundingConversionFinancialReconciliationReadStore
  implements
    AgenticWalletFundingConversionFinancialReconciliationReadStore,
    AgenticWalletFundingConversionFinancialReconciliationAttemptReadStore,
    AgenticWalletFundingConversionFinancialReconciliationStatusObservationReadStore,
    AgenticWalletFundingConversionFinancialReconciliationProviderOrderReadStore,
    AgenticWalletFundingConversionFinancialReconciliationTransactionReadStore,
    AgenticWalletFundingConversionFinancialReconciliationRequestFingerprintReadStore,
    AgenticWalletFundingConversionFinancialReconciliationPlanReadStore
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

  async getByProviderOrderId(
    providerOrderId: string,
  ): Promise<StoredFundingConversionFinancialReconciliation | null> {
    if (!isSafeAgenticWalletProviderOrderId(providerOrderId))
      throw new FundingConversionFinancialReconciliationProviderOrderIdentityError();

    const row =
      await this.prisma.agenticWalletFundingConversionFinancialReconciliation.findUnique(
        { where: { providerOrderId } },
      );
    if (row === null) return null;
    const reconciliation =
      mapPersistedFundingConversionFinancialReconciliation(row);
    if (reconciliation.evidence.providerOrderId !== providerOrderId)
      throw new Error(
        'Persisted funding conversion financial reconciliation provider order identity diverges',
      );
    return reconciliation;
  }

  async getByTransactionHash(
    transactionHash: string,
  ): Promise<StoredFundingConversionFinancialReconciliation | null> {
    if (!isCanonicalFundingConversionTransactionHash(transactionHash))
      throw new FundingConversionFinancialReconciliationTransactionIdentityError();

    const row =
      await this.prisma.agenticWalletFundingConversionFinancialReconciliation.findUnique(
        { where: { transactionHash } },
      );
    if (row === null) return null;
    const reconciliation =
      mapPersistedFundingConversionFinancialReconciliation(row);
    if (reconciliation.evidence.transactionHash !== transactionHash)
      throw new Error(
        'Persisted funding conversion financial reconciliation transaction identity diverges',
      );
    return reconciliation;
  }

  async getByRequestFingerprint(
    requestFingerprint: string,
  ): Promise<StoredFundingConversionFinancialReconciliation | null> {
    if (
      !isCanonicalFundingConversionFinancialReconciliationRequestFingerprint(
        requestFingerprint,
      )
    )
      throw new FundingConversionFinancialReconciliationRequestFingerprintIdentityError();

    const row =
      await this.prisma.agenticWalletFundingConversionFinancialReconciliation.findUnique(
        { where: { requestFingerprint } },
      );
    if (row === null) return null;
    const reconciliation =
      mapPersistedFundingConversionFinancialReconciliation(row);
    if (row.requestFingerprint !== requestFingerprint)
      throw new Error(
        'Persisted funding conversion financial reconciliation request fingerprint identity diverges',
      );
    return reconciliation;
  }

  async getByPlanId(
    planId: string,
  ): Promise<StoredFundingConversionFinancialReconciliation | null> {
    if (typeof planId !== 'string' || !UUID_PATTERN.test(planId))
      throw new FundingConversionFinancialReconciliationPlanIdentityError();

    const attempt =
      await this.prisma.agenticWalletFundingConversionSubmissionAttempt.findUnique(
        {
          where: { planId },
          select: { id: true, financialReconciliation: true },
        },
      );
    if (attempt === null || attempt.financialReconciliation === null)
      return null;
    const reconciliation = mapPersistedFundingConversionFinancialReconciliation(
      attempt.financialReconciliation,
    );
    if (
      reconciliation.planId !== planId ||
      reconciliation.attemptId !== attempt.id
    )
      throw new Error(
        'Persisted funding conversion financial reconciliation plan correlation diverges',
      );
    return reconciliation;
  }
}
