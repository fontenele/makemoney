import { assessAgenticWalletMarketSwapAccountingMutationPlan } from '../infrastructure/agentic-wallet-market-swap-accounting-mutation-plan';
import { prepareAgenticWalletMarketSwapAccountingMutationCommitment } from '../infrastructure/agentic-wallet-market-swap-accounting-mutation-commitment';
import {
  AgenticWalletMarketSwapAccountingMutationCommitmentBlockedError,
  AgenticWalletMarketSwapAccountingMutationCommitmentStore,
  AgenticWalletMarketSwapAccountingMutationEvidenceNotFoundError,
  StoredAgenticWalletMarketSwapAccountingMutationCommitment,
} from '../infrastructure/agentic-wallet-market-swap-accounting-mutation-commitment.store';
import { AgenticWalletMarketSwapAccountingBalanceEvidenceReadStore } from '../infrastructure/agentic-wallet-market-swap-accounting-balance-evidence.store';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const REQUEST_KEYS = ['gateId', 'mutationId'] as const;

export interface RealExecutionAccountingMutationCommitmentResult {
  readonly scope: 'real_execution_accounting_mutation_commitment';
  readonly status: 'accounting_mutation_commitment_recorded';
  readonly storedCommitment: StoredAgenticWalletMarketSwapAccountingMutationCommitment;
  readonly replayed: boolean;
  readonly providerCallStarted: false;
  readonly financialReconciliationComplete: true;
  readonly accountingMutationRequired: true;
  readonly accountingMutationAuthorized: false;
  readonly accountingMutationComplete: false;
  readonly submissionRetryAllowed: false;
}

export class InvalidRealExecutionAccountingMutationCommitmentRequestError extends Error {
  constructor() {
    super('Invalid real execution accounting mutation commitment request');
    this.name =
      InvalidRealExecutionAccountingMutationCommitmentRequestError.name;
  }
}

export class RealExecutionAccountingMutationCommitmentService {
  constructor(
    private readonly evidence: AgenticWalletMarketSwapAccountingBalanceEvidenceReadStore,
    private readonly commitments: AgenticWalletMarketSwapAccountingMutationCommitmentStore,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async prepare(
    input: unknown,
  ): Promise<RealExecutionAccountingMutationCommitmentResult> {
    const request = parseRequest(input);
    const storedEvidence = await this.evidence.getByGateId(request.gateId);
    if (storedEvidence === null)
      throw new AgenticWalletMarketSwapAccountingMutationEvidenceNotFoundError();

    const planAssessment =
      assessAgenticWalletMarketSwapAccountingMutationPlan(storedEvidence);
    if (planAssessment.plan === null)
      throw new AgenticWalletMarketSwapAccountingMutationCommitmentBlockedError(
        ['invalid_accounting_mutation_plan'],
      );

    const commitmentAssessment =
      prepareAgenticWalletMarketSwapAccountingMutationCommitment(
        planAssessment.plan,
        request.mutationId,
        this.now(),
      );
    if (commitmentAssessment.commitment === null)
      throw new AgenticWalletMarketSwapAccountingMutationCommitmentBlockedError(
        commitmentAssessment.blockers,
      );

    const recorded = await this.commitments.record(
      commitmentAssessment.commitment,
    );
    return {
      scope: 'real_execution_accounting_mutation_commitment',
      status: 'accounting_mutation_commitment_recorded',
      storedCommitment: recorded.stored,
      replayed: recorded.replayed,
      providerCallStarted: false,
      financialReconciliationComplete: true,
      accountingMutationRequired: true,
      accountingMutationAuthorized: false,
      accountingMutationComplete: false,
      submissionRetryAllowed: false,
    };
  }
}

function parseRequest(input: unknown): {
  readonly gateId: string;
  readonly mutationId: string;
} {
  if (
    typeof input !== 'object' ||
    input === null ||
    Array.isArray(input) ||
    Object.keys(input).length !== REQUEST_KEYS.length ||
    !REQUEST_KEYS.every((key) => Object.hasOwn(input, key))
  )
    throw new InvalidRealExecutionAccountingMutationCommitmentRequestError();
  const request = input as Record<string, unknown>;
  if (
    typeof request.gateId !== 'string' ||
    !UUID_PATTERN.test(request.gateId) ||
    typeof request.mutationId !== 'string' ||
    !UUID_PATTERN.test(request.mutationId)
  )
    throw new InvalidRealExecutionAccountingMutationCommitmentRequestError();
  return { gateId: request.gateId, mutationId: request.mutationId };
}
