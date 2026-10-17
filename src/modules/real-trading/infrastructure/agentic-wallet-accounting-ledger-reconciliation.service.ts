import {
  AgenticWalletAccountingLedgerReconciliationAssessment,
  AgenticWalletAccountingLedgerReconciliationRequest,
  isValidAgenticWalletAccountingLedgerReconciliationRequest,
  reconcileAgenticWalletAccountingLedger,
} from './agentic-wallet-accounting-ledger-reconciliation';
import { AgenticWalletAccountingLedgerSnapshotReadStore } from './agentic-wallet-accounting-ledger-snapshot.store';
import { AgenticWalletCapabilityObservation } from './agentic-wallet-capability.adapter';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export class AgenticWalletAccountingLedgerReconciliationRequestError extends Error {
  constructor() {
    super('Accounting ledger reconciliation request is invalid');
  }
}

export class AgenticWalletAccountingLedgerReconciliationService {
  constructor(
    private readonly snapshotStore: AgenticWalletAccountingLedgerSnapshotReadStore,
  ) {}

  async reconcile(
    initializationId: string,
    observation: AgenticWalletCapabilityObservation,
    request: AgenticWalletAccountingLedgerReconciliationRequest,
  ): Promise<AgenticWalletAccountingLedgerReconciliationAssessment | null> {
    if (
      typeof initializationId !== 'string' ||
      !UUID_PATTERN.test(initializationId) ||
      !isValidAgenticWalletAccountingLedgerReconciliationRequest(request)
    )
      throw new AgenticWalletAccountingLedgerReconciliationRequestError();

    const requestSnapshot = {
      maximumObservationAgeMs: request.maximumObservationAgeMs,
      evaluatedAt: new Date(request.evaluatedAt),
    };
    const observationSnapshot = cloneObservation(observation);
    const ledgerSnapshot = await this.snapshotStore.getByInitializationId(
      initializationId,
      new Date(requestSnapshot.evaluatedAt),
    );
    if (ledgerSnapshot === null) return null;
    return reconcileAgenticWalletAccountingLedger(
      ledgerSnapshot,
      observationSnapshot,
      requestSnapshot,
    );
  }
}

function cloneObservation(
  observation: AgenticWalletCapabilityObservation,
): AgenticWalletCapabilityObservation {
  return {
    ...observation,
    capabilities: {
      ...observation.capabilities,
      chains: observation.capabilities.chains.map((chain) => ({
        ...chain,
        operations: [...chain.operations],
      })),
      reads: { ...observation.capabilities.reads },
      observedAt: new Date(observation.capabilities.observedAt),
    },
    settings:
      observation.settings === null
        ? null
        : {
            ...observation.settings,
            sessionExpiresAt: new Date(observation.settings.sessionExpiresAt),
            signInMaximumAt: new Date(observation.settings.signInMaximumAt),
            inactivitySignOutAt: new Date(
              observation.settings.inactivitySignOutAt,
            ),
          },
    quota: observation.quota === null ? null : { ...observation.quota },
    addresses: observation.addresses.map((address) => ({ ...address })),
    balances: observation.balances.map((balance) => ({ ...balance })),
    gas:
      observation.gas === null
        ? null
        : {
            ...observation.gas,
            low: { ...observation.gas.low },
            medium: { ...observation.gas.medium },
            high: { ...observation.gas.high },
          },
  };
}
