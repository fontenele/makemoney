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
    try {
      const event = await this.prisma.riskControlEvent.create({
        data: { id, control: CONTROL, active, reason },
      });
      return { event: mapEvent(event), replayed: false };
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const existing = await this.prisma.riskControlEvent.findUnique({
          where: { id },
        });
        if (
          existing?.control === CONTROL &&
          existing.active === active &&
          existing.reason === reason
        ) {
          return { event: mapEvent(existing), replayed: true };
        }
        throw new EmergencyStopIdempotencyConflictError(id);
      }
      throw error;
    }
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
