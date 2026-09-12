export const EMERGENCY_STOP_REPOSITORY = Symbol('EMERGENCY_STOP_REPOSITORY');

export interface EmergencyStopEvent {
  id: string;
  active: boolean;
  reason: string;
  changedAt: Date;
}

export interface EmergencyStopRepository {
  current(): Promise<EmergencyStopEvent | undefined>;
  change(
    id: string,
    active: boolean,
    reason: string,
  ): Promise<{ event: EmergencyStopEvent; replayed: boolean }>;
}

export class EmergencyStopIdempotencyConflictError extends Error {
  constructor(readonly id: string) {
    super('Emergency-stop idempotency key was already used differently');
    this.name = EmergencyStopIdempotencyConflictError.name;
  }
}
