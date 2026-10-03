import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  EmergencyStopEvent,
  EmergencyStopIdempotencyConflictError,
  EmergencyStopRepository,
} from '../domain/emergency-stop';

const CONTROL = 'emergency_stop';

@Injectable()
export class PrismaEmergencyStopRepository implements EmergencyStopRepository {
  constructor(private readonly prisma: PrismaService) {}

  async current(): Promise<EmergencyStopEvent | undefined> {
    const event = await this.prisma.riskControlEvent.findFirst({
      where: { control: CONTROL },
      orderBy: [{ changedAt: 'desc' }, { id: 'desc' }],
    });
    return event ? mapEvent(event) : undefined;
  }

  async change(
    id: string,
    active: boolean,
    reason: string,
  ): Promise<{ event: EmergencyStopEvent; replayed: boolean }> {
    return this.prisma.$transaction(
      async (tx) => {
        // Submission-gate creation takes the same lock before its final stop
        // read, so a stop change cannot cross that atomic decision boundary.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(20261003, 34)`;
        const existing = await tx.riskControlEvent.findUnique({
          where: { id },
        });
        if (existing) {
          if (
            existing.control === CONTROL &&
            existing.active === active &&
            existing.reason === reason
          ) {
            return { event: mapEvent(existing), replayed: true };
          }
          throw new EmergencyStopIdempotencyConflictError(id);
        }
        try {
          const event = await tx.riskControlEvent.create({
            data: { id, control: CONTROL, active, reason },
          });
          return { event: mapEvent(event), replayed: false };
        } catch (error: unknown) {
          if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === 'P2002'
          ) {
            throw new EmergencyStopIdempotencyConflictError(id);
          }
          throw error;
        }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }
}

function mapEvent(event: {
  id: string;
  active: boolean;
  reason: string;
  changedAt: Date;
}): EmergencyStopEvent {
  return {
    id: event.id,
    active: event.active,
    reason: event.reason,
    changedAt: event.changedAt,
  };
}
