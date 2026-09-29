import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Put,
} from '@nestjs/common';
import {
  PolymarketAvailabilityService,
  PolymarketAvailabilityState,
} from '../application/polymarket-availability.service';

@Controller('polymarket/settings')
export class PolymarketSettingsController {
  constructor(private readonly availability: PolymarketAvailabilityService) {}

  @Get()
  getSettings(): PolymarketAvailabilityState {
    return this.availability.current();
  }

  @Put()
  changeSettings(@Body() body: unknown): PolymarketAvailabilityState {
    const change = validChange(body);
    return this.availability.setEnabled(change.enabled);
  }
}

function validChange(value: unknown): {
  enabled: boolean;
  accessConfirmed: boolean;
} {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new BadRequestException('Invalid Polymarket settings change');
  }
  const candidate = value as Record<string, unknown>;
  if (
    Object.keys(candidate).some(
      (key) => key !== 'enabled' && key !== 'accessConfirmed',
    ) ||
    Object.keys(candidate).length !== 2
  ) {
    throw new BadRequestException('Invalid Polymarket settings change');
  }
  if (typeof candidate.enabled !== 'boolean') {
    throw new BadRequestException('enabled must be a boolean');
  }
  if (typeof candidate.accessConfirmed !== 'boolean') {
    throw new BadRequestException('accessConfirmed must be a boolean');
  }
  if (candidate.enabled && !candidate.accessConfirmed) {
    throw new BadRequestException(
      'Polymarket access requirements must be confirmed before enabling',
    );
  }
  return {
    enabled: candidate.enabled,
    accessConfirmed: candidate.accessConfirmed,
  };
}
