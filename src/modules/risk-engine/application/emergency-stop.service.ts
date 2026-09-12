import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  EMERGENCY_STOP_REPOSITORY,
  EmergencyStopRepository,
} from '../domain/emergency-stop';

export interface EmergencyStopState {
  active: boolean;
  source: 'configuration' | 'persisted';
  changeId: string | null;
  reason: string | null;
  changedAt: Date | null;
  replayed: boolean;
}

@Injectable()
export class EmergencyStopService implements OnModuleInit {
  private readonly logger = new Logger(EmergencyStopService.name);
  private state!: EmergencyStopState;

  constructor(
    private readonly config: ConfigService,
    @Inject(EMERGENCY_STOP_REPOSITORY)
    private readonly repository: EmergencyStopRepository,
  ) {
    this.state = this.configurationState();
  }

  async onModuleInit(): Promise<void> {
    const current = await this.repository.current();
    if (current) this.state = persistedState(current, false);
    this.logger.log({ event: 'risk.emergency_stop.loaded', ...this.state });
  }

  isActive(): boolean {
    return this.state.active;
  }

  current(): EmergencyStopState {
    return { ...this.state };
  }

  async change(
    id: string,
    active: boolean,
    reason: string,
  ): Promise<EmergencyStopState> {
    const result = await this.repository.change(id, active, reason);
    this.state = persistedState(result.event, false);
    const response = { ...this.state, replayed: result.replayed };
    this.logger.log({ event: 'risk.emergency_stop.changed', ...response });
    return response;
  }

  private configurationState(): EmergencyStopState {
    return {
      active: this.config.getOrThrow<boolean>('RISK_EMERGENCY_STOP'),
      source: 'configuration',
      changeId: null,
      reason: null,
      changedAt: null,
      replayed: false,
    };
  }
}

function persistedState(
  event: { id: string; active: boolean; reason: string; changedAt: Date },
  replayed: boolean,
): EmergencyStopState {
  return {
    active: event.active,
    source: 'persisted',
    changeId: event.id,
    reason: event.reason,
    changedAt: event.changedAt,
    replayed,
  };
}
