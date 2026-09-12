import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  Headers,
  Put,
} from '@nestjs/common';
import {
  EmergencyStopService,
  EmergencyStopState,
} from '../application/emergency-stop.service';
import { EmergencyStopIdempotencyConflictError } from '../domain/emergency-stop';

@Controller('risk')
export class RiskControlController {
  constructor(private readonly emergencyStop: EmergencyStopService) {}

  @Get('emergency-stop')
  getEmergencyStop(): EmergencyStopState {
    return this.emergencyStop.current();
  }

  @Put('emergency-stop')
  async changeEmergencyStop(
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: unknown,
  ): Promise<EmergencyStopState> {
    const id = validIdempotencyKey(idempotencyKey);
    const change = validChange(body);
    try {
      return await this.emergencyStop.change(id, change.active, change.reason);
    } catch (error: unknown) {
      if (error instanceof EmergencyStopIdempotencyConflictError) {
        throw new ConflictException(error.message);
      }
      throw error;
    }
  }
}

function validIdempotencyKey(value: string | undefined): string {
  if (!value || !/^[A-Za-z0-9_-]{1,100}$/.test(value)) {
    throw new BadRequestException('Invalid Idempotency-Key header');
  }
  return value;
}

function validChange(value: unknown): { active: boolean; reason: string } {
  if (!value || typeof value !== 'object') {
    throw new BadRequestException('Invalid emergency-stop change');
  }
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.active !== 'boolean') {
    throw new BadRequestException('active must be a boolean');
  }
  if (
    typeof candidate.reason !== 'string' ||
    candidate.reason.trim().length === 0 ||
    candidate.reason.trim().length > 200
  ) {
    throw new BadRequestException('reason must contain 1 to 200 characters');
  }
  return { active: candidate.active, reason: candidate.reason.trim() };
}
