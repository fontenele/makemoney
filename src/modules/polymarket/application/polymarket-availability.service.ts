import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface PolymarketAvailabilityState {
  enabled: boolean;
  startupDefault: boolean;
  source: 'startup' | 'runtime';
  changedAt: Date | null;
}

@Injectable()
export class PolymarketAvailabilityService {
  private readonly startupDefault: boolean;
  private runtimeOverride: boolean | null = null;
  private changedAt: Date | null = null;

  constructor(config: ConfigService) {
    this.startupDefault = config.getOrThrow<boolean>('POLYMARKET_ENABLED');
  }

  current(): PolymarketAvailabilityState {
    return {
      enabled: this.isEnabled(),
      startupDefault: this.startupDefault,
      source: this.runtimeOverride === null ? 'startup' : 'runtime',
      changedAt: this.changedAt,
    };
  }

  isEnabled(): boolean {
    return this.runtimeOverride ?? this.startupDefault;
  }

  setEnabled(enabled: boolean): PolymarketAvailabilityState {
    if (enabled === this.isEnabled()) return this.current();
    this.runtimeOverride = enabled;
    this.changedAt = new Date();
    return this.current();
  }
}
