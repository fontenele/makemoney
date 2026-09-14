import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  BacktestRun,
  BacktestRunIdempotencyConflictError,
  BacktestRunRepository,
  JsonValue,
} from '../domain/backtest-run';

@Injectable()
export class PrismaBacktestRunRepository implements BacktestRunRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string): Promise<BacktestRun | undefined> {
    const run = await this.prisma.backtestRun.findUnique({ where: { id } });
    return run ? mapRun(run) : undefined;
  }

  async findRecent(
    limit: number,
    cursor?: Pick<BacktestRun, 'id' | 'createdAt'>,
  ): Promise<BacktestRun[]> {
    return (
      await this.prisma.backtestRun.findMany({
        where: cursor
          ? {
              OR: [
                { createdAt: { lt: cursor.createdAt } },
                { createdAt: cursor.createdAt, id: { lt: cursor.id } },
              ],
            }
          : undefined,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limit,
      })
    ).map(mapRun);
  }

  async findByIdempotencyKey(key: string): Promise<BacktestRun | undefined> {
    const run = await this.prisma.backtestRun.findUnique({
      where: { idempotencyKey: key },
    });
    return run ? mapRun(run) : undefined;
  }

  async create(
    run: Omit<BacktestRun, 'id' | 'createdAt'>,
  ): Promise<{ run: BacktestRun; replayed: boolean }> {
    try {
      return {
        run: mapRun(
          await this.prisma.backtestRun.create({
            data: {
              idempotencyKey: run.idempotencyKey,
              requestFingerprint: run.requestFingerprint,
              request: run.request as Prisma.InputJsonValue,
              result: run.result as Prisma.InputJsonValue,
            },
          }),
        ),
        replayed: false,
      };
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const existing = await this.findByIdempotencyKey(run.idempotencyKey);
        if (existing?.requestFingerprint === run.requestFingerprint) {
          return { run: existing, replayed: true };
        }
        throw new BacktestRunIdempotencyConflictError();
      }
      throw error;
    }
  }
}

function mapRun(run: {
  id: string;
  idempotencyKey: string;
  requestFingerprint: string;
  request: Prisma.JsonValue;
  result: Prisma.JsonValue;
  createdAt: Date;
}): BacktestRun {
  return {
    ...run,
    request: run.request as JsonValue,
    result: run.result as JsonValue,
  };
}
