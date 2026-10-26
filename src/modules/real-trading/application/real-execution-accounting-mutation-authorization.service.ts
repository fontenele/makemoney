import {
  ACCOUNTING_MUTATION_AUTHORIZATION_ACKNOWLEDGMENT,
  AgenticWalletMarketSwapAccountingMutationAuthorizationRequest,
  authorizeAgenticWalletMarketSwapAccountingMutation,
} from '../infrastructure/agentic-wallet-market-swap-accounting-mutation-authorization';
import {
  AgenticWalletMarketSwapAccountingMutationAuthorizationBlockedError,
  AgenticWalletMarketSwapAccountingMutationAuthorizationStore,
  AgenticWalletMarketSwapAccountingMutationCommitmentNotFoundError,
  StoredAgenticWalletMarketSwapAccountingMutationAuthorization,
} from '../infrastructure/agentic-wallet-market-swap-accounting-mutation-authorization.store';
import { AgenticWalletMarketSwapAccountingMutationCommitmentReadStore } from '../infrastructure/agentic-wallet-market-swap-accounting-mutation-commitment.store';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const EVM_TRANSACTION_HASH_PATTERN = /^0x[0-9a-f]{64}$/;
const REQUEST_KEYS = [
  'authorizationId',
  'mutationId',
  'planFingerprint',
  'gateId',
  'transactionHash',
  'acknowledgment',
] as const;

export interface RealExecutionAccountingMutationAuthorizationResult {
  readonly scope: 'real_execution_accounting_mutation_authorization';
  readonly status: 'accounting_mutation_authorization_recorded';
  readonly storedAuthorization: StoredAgenticWalletMarketSwapAccountingMutationAuthorization;
  readonly replayed: boolean;
  readonly providerCallStarted: false;
  readonly financialReconciliationComplete: true;
  readonly accountingMutationRequired: true;
  readonly accountingMutationAuthorized: true;
  readonly accountingMutationComplete: false;
  readonly submissionRetryAllowed: false;
}

export class InvalidRealExecutionAccountingMutationAuthorizationRequestError extends Error {
  constructor() {
    super('Invalid real execution accounting mutation authorization request');
    this.name =
      InvalidRealExecutionAccountingMutationAuthorizationRequestError.name;
  }
}

export class RealExecutionAccountingMutationAuthorizationService {
  constructor(
    private readonly commitments: AgenticWalletMarketSwapAccountingMutationCommitmentReadStore,
    private readonly authorizations: AgenticWalletMarketSwapAccountingMutationAuthorizationStore,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async authorize(
    input: unknown,
  ): Promise<RealExecutionAccountingMutationAuthorizationResult> {
    const request = parseRequest(input);
    const storedCommitment = await this.commitments.getByGateId(request.gateId);
    if (storedCommitment === null)
      throw new AgenticWalletMarketSwapAccountingMutationCommitmentNotFoundError();

    const assessment = authorizeAgenticWalletMarketSwapAccountingMutation(
      storedCommitment,
      { ...request, authorizedAt: this.now() },
    );
    if (assessment.authorization === null)
      throw new AgenticWalletMarketSwapAccountingMutationAuthorizationBlockedError(
        assessment.blockers,
      );

    const recorded = await this.authorizations.record(assessment.authorization);
    return {
      scope: 'real_execution_accounting_mutation_authorization',
      status: 'accounting_mutation_authorization_recorded',
      storedAuthorization: recorded.stored,
      replayed: recorded.replayed,
      providerCallStarted: false,
      financialReconciliationComplete: true,
      accountingMutationRequired: true,
      accountingMutationAuthorized: true,
      accountingMutationComplete: false,
      submissionRetryAllowed: false,
    };
  }
}

function parseRequest(
  input: unknown,
): Omit<
  AgenticWalletMarketSwapAccountingMutationAuthorizationRequest,
  'authorizedAt'
> {
  if (
    typeof input !== 'object' ||
    input === null ||
    Array.isArray(input) ||
    Object.keys(input).length !== REQUEST_KEYS.length ||
    !REQUEST_KEYS.every((key) => Object.hasOwn(input, key))
  )
    throw new InvalidRealExecutionAccountingMutationAuthorizationRequestError();
  const request = input as Record<string, unknown>;
  if (
    typeof request.authorizationId !== 'string' ||
    !UUID_PATTERN.test(request.authorizationId) ||
    typeof request.mutationId !== 'string' ||
    !UUID_PATTERN.test(request.mutationId) ||
    typeof request.planFingerprint !== 'string' ||
    !SHA256_PATTERN.test(request.planFingerprint) ||
    typeof request.gateId !== 'string' ||
    !UUID_PATTERN.test(request.gateId) ||
    typeof request.transactionHash !== 'string' ||
    !EVM_TRANSACTION_HASH_PATTERN.test(request.transactionHash) ||
    request.acknowledgment !== ACCOUNTING_MUTATION_AUTHORIZATION_ACKNOWLEDGMENT
  )
    throw new InvalidRealExecutionAccountingMutationAuthorizationRequestError();
  return request as Omit<
    AgenticWalletMarketSwapAccountingMutationAuthorizationRequest,
    'authorizedAt'
  >;
}
