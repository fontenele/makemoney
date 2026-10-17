import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  AgenticWalletAccountingBalanceInitializationIdentityError,
  AgenticWalletAccountingBalanceInitializationReadStore,
  InitializedAgenticWalletAccountingBalances,
} from './agentic-wallet-accounting-balance-initialization.store';
import { mapPersistedAgenticWalletAccountingBalanceInitialization } from './prisma-agentic-wallet-accounting-balance-initialization.store';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export class PrismaAgenticWalletAccountingBalanceInitializationReadStore implements AgenticWalletAccountingBalanceInitializationReadStore {
  constructor(private readonly prisma: PrismaService) {}

  async getByInitializationId(
    initializationId: string,
  ): Promise<InitializedAgenticWalletAccountingBalances | null> {
    if (
      typeof initializationId !== 'string' ||
      !UUID_PATTERN.test(initializationId)
    )
      throw new AgenticWalletAccountingBalanceInitializationIdentityError();

    const row =
      await this.prisma.realExecutionAccountingBalanceInitialization.findUnique(
        { where: { id: initializationId } },
      );
    if (row === null) return null;
    const initialized =
      mapPersistedAgenticWalletAccountingBalanceInitialization(row);
    if (initialized.initialization.initializationId !== initializationId)
      throw new Error('Persisted accounting balance initialization is invalid');
    return initialized;
  }
}
