import { assertNoUnresolvedApprovalCleanup } from './approval-cleanup-execution-guard';
import { createHash } from 'node:crypto';

import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  RealExecutionSubmissionAttemptBlockedError,
  RealExecutionSubmissionAttemptBlocker,
  RealExecutionSubmissionAttemptClaim,
  RealExecutionSubmissionAttemptConflictError,
  RealExecutionSubmissionAttemptStore,
  ClaimedRealExecutionSubmissionCommand,
  StoredRealExecutionSubmissionAttempt,
} from '../application/real-execution-submission-attempt.store';
import { prepareAgenticWalletMarketSwapCommand } from './agentic-wallet-market-swap-command';
import { mapPersistedRealExecutionSubmissionGate } from './prisma-real-execution-submission-gate.store';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const DIGEST_PATTERN = /^[a-f0-9]{64}$/;
const CHANGE_ID_PATTERN = /^[A-Za-z0-9_-]{1,100}$/;
const EMERGENCY_STOP_CONTROL = 'emergency_stop';

@Injectable()
export class PrismaRealExecutionSubmissionAttemptStore implements RealExecutionSubmissionAttemptStore {
  constructor(
    private readonly prisma: PrismaService,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async claim(claim: RealExecutionSubmissionAttemptClaim): Promise<{
    attempt: StoredRealExecutionSubmissionAttempt;
    replayed: boolean;
    command: ClaimedRealExecutionSubmissionCommand | null;
  }> {
    const shapeBlockers: RealExecutionSubmissionAttemptBlocker[] = [];
    addIf(shapeBlockers, !UUID_PATTERN.test(claim.id), 'invalid_attempt_id');
    addIf(shapeBlockers, !UUID_PATTERN.test(claim.gateId), 'invalid_gate_id');
    if (shapeBlockers.length > 0) {
      throw new RealExecutionSubmissionAttemptBlockedError(shapeBlockers);
    }

    const requestFingerprint = fingerprint(claim);
    try {
      return await this.prisma.$transaction(
        async (tx) => {
          // Emergency-stop writes and atomic gate creation use this same lock.
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(20261003, 34)`;
          const diagnostic = await tx.$queryRaw<
            Array<{ id: string }>
          >`SELECT id FROM gas_diagnostics WHERE state <> 'prepared' OR expires_at > now() LIMIT 1`;
          if (diagnostic.length)
            throw new Error(
              'A gas diagnostic blocks ordinary provider submission',
            );

          await assertNoUnresolvedApprovalCleanup(tx);

          const existingByGate =
            await tx.realExecutionSubmissionAttempt.findUnique({
              where: { gateId: claim.gateId },
            });
          if (existingByGate) {
            if (
              existingByGate.id !== claim.id ||
              existingByGate.requestFingerprint !== requestFingerprint
            ) {
              throw new RealExecutionSubmissionAttemptConflictError();
            }
            return {
              attempt:
                mapPersistedRealExecutionSubmissionAttempt(existingByGate),
              replayed: true,
              command: null,
            };
          }

          const existingById =
            await tx.realExecutionSubmissionAttempt.findUnique({
              where: { id: claim.id },
            });
          if (existingById) {
            throw new RealExecutionSubmissionAttemptConflictError();
          }

          const gateRow = await tx.realExecutionSubmissionGate.findUnique({
            where: { id: claim.gateId },
            include: { submissionReceipt: { select: { gateId: true } } },
          });
          if (!gateRow) {
            throw new RealExecutionSubmissionAttemptBlockedError([
              'submission_gate_not_found',
            ]);
          }

          let gate;
          try {
            gate = mapPersistedRealExecutionSubmissionGate(gateRow);
          } catch {
            throw new RealExecutionSubmissionAttemptBlockedError([
              'submission_gate_invalid',
            ]);
          }

          const claimedAt = this.now();
          const commandAssessment = prepareAgenticWalletMarketSwapCommand(
            gate,
            claimedAt,
          );
          const blockers: RealExecutionSubmissionAttemptBlocker[] = [];
          addIf(
            blockers,
            commandAssessment.blockers.includes('invalid_submission_gate') ||
              commandAssessment.blockers.includes('invalid_evaluation_time') ||
              commandAssessment.blockers.includes(
                'submission_gate_from_future',
              ),
            'submission_gate_invalid',
          );
          addIf(
            blockers,
            commandAssessment.blockers.includes('submission_gate_expired'),
            'submission_gate_expired',
          );
          addIf(
            blockers,
            gateRow.submissionReceipt !== null,
            'submission_receipt_already_exists',
          );

          const emergencyStop = await tx.riskControlEvent.findFirst({
            where: { control: EMERGENCY_STOP_CONTROL },
            orderBy: [{ changedAt: 'desc' }, { id: 'desc' }],
          });
          addIf(
            blockers,
            emergencyStop === null,
            'emergency_stop_not_persisted',
          );
          addIf(
            blockers,
            emergencyStop === null || emergencyStop.active,
            'emergency_stop_active',
          );
          addIf(
            blockers,
            emergencyStop !== null &&
              emergencyStop.id !== gate.emergencyStopChangeId,
            'emergency_stop_change_mismatch',
          );

          if (blockers.length > 0 || commandAssessment.command === null) {
            throw new RealExecutionSubmissionAttemptBlockedError(blockers);
          }

          const created = await tx.realExecutionSubmissionAttempt.create({
            data: {
              id: claim.id,
              gateId: gate.id,
              requestFingerprint,
              providerId: gate.providerId,
              chainId: gate.chainId,
              payloadCommitmentVersion: gate.payloadCommitmentVersion,
              payloadCommitmentDigest: gate.payloadCommitmentDigest,
              emergencyStopChangeId: gate.emergencyStopChangeId,
              commandArgumentsFingerprint: digest(
                JSON.stringify(commandAssessment.command.arguments),
              ),
              state: 'submission_claimed',
              automaticRetryAllowed: false,
              claimedAt,
            },
          });
          return {
            attempt: mapPersistedRealExecutionSubmissionAttempt(created),
            replayed: false,
            command: {
              kind: 'agentic_wallet_claimed_market_swap',
              attemptId: created.id,
              gateId: created.gateId,
              arguments: [...commandAssessment.command.arguments],
              commandArgumentsFingerprint: created.commandArgumentsFingerprint,
              automaticRetryAllowed: false,
            },
          };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === 'P2002' || error.code === 'P2034')
      ) {
        throw new RealExecutionSubmissionAttemptConflictError();
      }
      throw error;
    }
  }
}

function fingerprint(claim: RealExecutionSubmissionAttemptClaim): string {
  return digest(JSON.stringify({ gateId: claim.gateId, id: claim.id }));
}

function digest(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function mapPersistedRealExecutionSubmissionAttempt(row: {
  id: string;
  gateId: string;
  requestFingerprint: string;
  providerId: string;
  chainId: string;
  payloadCommitmentVersion: string;
  payloadCommitmentDigest: string;
  emergencyStopChangeId: string;
  commandArgumentsFingerprint: string;
  state: string;
  automaticRetryAllowed: boolean;
  claimedAt: Date;
}): StoredRealExecutionSubmissionAttempt {
  const expectedFingerprint = fingerprint({ id: row.id, gateId: row.gateId });
  if (
    !UUID_PATTERN.test(row.id) ||
    !UUID_PATTERN.test(row.gateId) ||
    row.requestFingerprint !== expectedFingerprint ||
    row.providerId !== 'agentic_wallet' ||
    row.chainId !== '56' ||
    row.payloadCommitmentVersion !== 'real_execution_intent_quote_v1' ||
    !DIGEST_PATTERN.test(row.payloadCommitmentDigest) ||
    !CHANGE_ID_PATTERN.test(row.emergencyStopChangeId) ||
    !DIGEST_PATTERN.test(row.commandArgumentsFingerprint) ||
    row.state !== 'submission_claimed' ||
    row.automaticRetryAllowed !== false ||
    !(row.claimedAt instanceof Date) ||
    !Number.isFinite(row.claimedAt.getTime())
  ) {
    throw new Error('Persisted real execution submission attempt is invalid');
  }
  return {
    id: row.id,
    gateId: row.gateId,
    requestFingerprint: row.requestFingerprint,
    providerId: 'agentic_wallet',
    chainId: '56',
    payloadCommitmentVersion: 'real_execution_intent_quote_v1',
    payloadCommitmentDigest: row.payloadCommitmentDigest,
    emergencyStopChangeId: row.emergencyStopChangeId,
    commandArgumentsFingerprint: row.commandArgumentsFingerprint,
    state: 'submission_claimed',
    automaticRetryAllowed: false,
    providerSubmissionStarted: false,
    submissionAuthorized: false,
    claimedAt: new Date(row.claimedAt),
  };
}

function addIf(
  blockers: RealExecutionSubmissionAttemptBlocker[],
  condition: boolean,
  blocker: RealExecutionSubmissionAttemptBlocker,
): void {
  if (condition && !blockers.includes(blocker)) blockers.push(blocker);
}
