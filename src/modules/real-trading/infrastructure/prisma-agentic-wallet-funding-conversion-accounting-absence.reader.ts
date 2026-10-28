import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { AgenticWalletFundingConversionAccountingAbsenceReader } from '../application/agentic-wallet-funding-conversion-accounting-absence.reader';
import type { FundingConversionAccountingAbsenceEvidence } from '../application/agentic-wallet-funding-conversion-accounting-bootstrap';

export class PrismaAgenticWalletFundingConversionAccountingAbsenceReader extends AgenticWalletFundingConversionAccountingAbsenceReader {
  constructor(
    private readonly prisma: PrismaService,
    private readonly now: () => Date = () => new Date(),
  ) {
    super();
  }

  async inspect(): Promise<FundingConversionAccountingAbsenceEvidence> {
    return this.prisma.$transaction(
      async (tx) => {
        const [initializationCount, balanceCount, synchronizationCount] =
          await Promise.all([
            tx.realExecutionAccountingBalanceInitialization.count(),
            tx.realExecutionAccountingBalance.count(),
            tx.agenticWalletFundingConversionAccountingSync.count(),
          ]);
        const inspectedAt = this.now();
        if (!Number.isFinite(inspectedAt.getTime()))
          throw new Error(
            'Funding conversion accounting inspection time is invalid',
          );
        return {
          scope: 'funding_conversion_accounting_absence_evidence',
          initializationCount,
          balanceCount,
          synchronizationCount,
          inspectedAt: new Date(inspectedAt),
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
}
