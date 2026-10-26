import { AgenticWalletMarketSwapCommandRunner } from '../infrastructure/agentic-wallet-market-swap-command-runner';
import { assessAgenticWalletMarketSwapSubmissionOutcome } from '../infrastructure/agentic-wallet-market-swap-submission-outcome';
import { RealExecutionSubmissionAttemptStore } from './real-execution-submission-attempt.store';
import { RealExecutionSubmissionOutcomeStore } from './real-execution-submission-outcome.store';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export interface RealExecutionSubmissionRequest {
  readonly attemptId: string;
  readonly gateId: string;
}

export class InvalidRealExecutionSubmissionRequestError extends Error {}
export class RealExecutionSubmissionAlreadyClaimedError extends Error {}

export class RealExecutionSubmissionService {
  constructor(
    private readonly attempts: RealExecutionSubmissionAttemptStore,
    private readonly runner: AgenticWalletMarketSwapCommandRunner,
    private readonly outcomes: RealExecutionSubmissionOutcomeStore,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async submit(request: unknown, signal?: AbortSignal) {
    const input = parseRequest(request);
    if (signal?.aborted) throw signal.reason;

    const claimed = await this.attempts.claim({
      id: input.attemptId,
      gateId: input.gateId,
    });
    if (claimed.replayed) {
      const existing = await this.outcomes.findByAttemptId(input.attemptId);
      if (existing === null) {
        throw new RealExecutionSubmissionAlreadyClaimedError();
      }
      return { outcome: existing, replayed: true };
    }
    if (claimed.command === null) {
      throw new Error('Fresh real execution claim did not provide a command');
    }
    if (
      claimed.command.attemptId !== claimed.attempt.id ||
      claimed.command.gateId !== claimed.attempt.gateId ||
      claimed.command.commandArgumentsFingerprint !==
        claimed.attempt.commandArgumentsFingerprint
    ) {
      throw new Error('Fresh real execution claimed command is inconsistent');
    }

    let response: unknown;
    try {
      response = await this.runner.run(claimed.command, signal);
    } catch {
      response = undefined;
    }
    const outcome = assessAgenticWalletMarketSwapSubmissionOutcome(
      claimed.attempt.id,
      claimed.attempt.gateId,
      response,
    );
    return this.outcomes.record(outcome, this.now());
  }
}

function parseRequest(value: unknown): RealExecutionSubmissionRequest {
  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value) ||
    Object.keys(value).sort().join(',') !== 'attemptId,gateId' ||
    !('attemptId' in value) ||
    typeof value.attemptId !== 'string' ||
    !UUID_PATTERN.test(value.attemptId) ||
    !('gateId' in value) ||
    typeof value.gateId !== 'string' ||
    !UUID_PATTERN.test(value.gateId)
  ) {
    throw new InvalidRealExecutionSubmissionRequestError();
  }
  return { attemptId: value.attemptId, gateId: value.gateId };
}
