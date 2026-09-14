export const BACKTEST_RUN_REPOSITORY = Symbol('BACKTEST_RUN_REPOSITORY');

export type JsonValue =
  null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

export interface BacktestRun {
  id: string;
  idempotencyKey: string;
  requestFingerprint: string;
  request: JsonValue;
  result: JsonValue;
  createdAt: Date;
}

export interface BacktestRunRepository {
  findById(id: string): Promise<BacktestRun | undefined>;
  deleteById(id: string): Promise<boolean>;
  findRecent(
    limit: number,
    cursor?: Pick<BacktestRun, 'id' | 'createdAt'>,
    createdFrom?: Date,
    createdTo?: Date,
  ): Promise<BacktestRun[]>;
  findByIdempotencyKey(key: string): Promise<BacktestRun | undefined>;
  create(
    run: Omit<BacktestRun, 'id' | 'createdAt'>,
  ): Promise<{ run: BacktestRun; replayed: boolean }>;
}

export class BacktestRunCursorNotFoundError extends Error {
  constructor() {
    super('Backtest run cursor was not found');
    this.name = BacktestRunCursorNotFoundError.name;
  }
}

export class BacktestRunIdempotencyConflictError extends Error {
  constructor() {
    super('Backtest run idempotency key was already used differently');
    this.name = BacktestRunIdempotencyConflictError.name;
  }
}
