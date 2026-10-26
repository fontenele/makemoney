import { ConfigService } from '@nestjs/config';

import { APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT } from './real-execution-instrument-approval';
import { RealExecutionSubmissionService } from './real-execution-submission.service';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
export const REAL_EXECUTION_OPERATOR_ACKNOWLEDGMENT =
  'approved_gate_and_immediate_provider_submission_reviewed' as const;

export interface RealExecutionOperatorEnvironment {
  readonly TRADING_MODE: 'paper' | 'real';
  readonly REAL_EXECUTION_ENABLED: boolean;
  readonly REAL_EXECUTION_OPERATOR_SUBMISSION_ENABLED: boolean;
  readonly REAL_EXECUTION_APPROVED_PROVIDER_ID: string | null;
  readonly REAL_EXECUTION_APPROVED_CHAIN_ID: string | null;
  readonly REAL_EXECUTION_APPROVED_SOURCE_TOKEN_ADDRESS: string | null;
  readonly REAL_EXECUTION_APPROVED_TARGET_TOKEN_ADDRESS: string | null;
}

export interface RealExecutionOperatorSubmissionRequest {
  readonly attemptId: string;
  readonly gateId: string;
  readonly acknowledgment: typeof REAL_EXECUTION_OPERATOR_ACKNOWLEDGMENT;
}

export type RealExecutionOperatorSubmissionBlocker =
  | 'real_trading_mode_disabled'
  | 'real_execution_disabled'
  | 'operator_submission_disabled'
  | 'provider_not_approved'
  | 'chain_not_approved'
  | 'instrument_not_approved';

export class InvalidRealExecutionOperatorSubmissionRequestError extends Error {}
export class RealExecutionOperatorSubmissionBlockedError extends Error {
  constructor(
    readonly blockers: readonly RealExecutionOperatorSubmissionBlocker[],
  ) {
    super(`Real execution operator submission blocked: ${blockers.join(', ')}`);
  }
}

export class RealExecutionOperatorSubmissionService {
  constructor(
    private readonly config: ConfigService<
      RealExecutionOperatorEnvironment,
      true
    >,
    private readonly submissions: RealExecutionSubmissionService,
  ) {}

  submit(value: unknown, signal?: AbortSignal) {
    const request = parseRequest(value);
    this.assertRuntimeReady();
    return this.submissions.submit(
      { attemptId: request.attemptId, gateId: request.gateId },
      signal,
    );
  }

  private assertRuntimeReady(): void {
    const blockers: RealExecutionOperatorSubmissionBlocker[] = [];
    addIf(
      blockers,
      this.config.get('TRADING_MODE', { infer: true }) !== 'real',
      'real_trading_mode_disabled',
    );
    addIf(
      blockers,
      this.config.get('REAL_EXECUTION_ENABLED', { infer: true }) !== true,
      'real_execution_disabled',
    );
    addIf(
      blockers,
      this.config.get('REAL_EXECUTION_OPERATOR_SUBMISSION_ENABLED', {
        infer: true,
      }) !== true,
      'operator_submission_disabled',
    );
    const approved = APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT;
    addIf(
      blockers,
      this.config.get('REAL_EXECUTION_APPROVED_PROVIDER_ID', {
        infer: true,
      }) !== approved.providerId,
      'provider_not_approved',
    );
    addIf(
      blockers,
      this.config.get('REAL_EXECUTION_APPROVED_CHAIN_ID', { infer: true }) !==
        approved.chainId,
      'chain_not_approved',
    );
    const source = lower(
      this.config.get('REAL_EXECUTION_APPROVED_SOURCE_TOKEN_ADDRESS', {
        infer: true,
      }),
    );
    const target = lower(
      this.config.get('REAL_EXECUTION_APPROVED_TARGET_TOKEN_ADDRESS', {
        infer: true,
      }),
    );
    const usdt = approved.usdt.tokenAddress;
    const btcb = approved.btc.tokenAddress;
    addIf(
      blockers,
      !(
        (source === usdt && target === btcb) ||
        (source === btcb && target === usdt)
      ),
      'instrument_not_approved',
    );
    if (blockers.length > 0) {
      throw new RealExecutionOperatorSubmissionBlockedError(blockers);
    }
  }
}

function parseRequest(value: unknown): RealExecutionOperatorSubmissionRequest {
  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value) ||
    Object.keys(value).sort().join(',') !== 'acknowledgment,attemptId,gateId' ||
    !('attemptId' in value) ||
    typeof value.attemptId !== 'string' ||
    !UUID_PATTERN.test(value.attemptId) ||
    !('gateId' in value) ||
    typeof value.gateId !== 'string' ||
    !UUID_PATTERN.test(value.gateId) ||
    !('acknowledgment' in value) ||
    value.acknowledgment !== REAL_EXECUTION_OPERATOR_ACKNOWLEDGMENT
  ) {
    throw new InvalidRealExecutionOperatorSubmissionRequestError();
  }
  return {
    attemptId: value.attemptId,
    gateId: value.gateId,
    acknowledgment: REAL_EXECUTION_OPERATOR_ACKNOWLEDGMENT,
  };
}

function lower(value: string | null): string | null {
  return value?.toLowerCase() ?? null;
}

function addIf(
  blockers: RealExecutionOperatorSubmissionBlocker[],
  condition: boolean,
  blocker: RealExecutionOperatorSubmissionBlocker,
): void {
  if (condition && !blockers.includes(blocker)) blockers.push(blocker);
}
