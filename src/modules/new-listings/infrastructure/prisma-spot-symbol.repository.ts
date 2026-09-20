import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  DetectedSpotSymbol,
  DetectedSpotSymbolFilters,
  DetectedSpotSymbolQuery,
  DetectedSpotSymbolSummary,
  SpotSymbolCatalog,
  SpotSymbol,
  SpotSymbolRepository,
} from '../domain/spot-symbol-catalog';
import {
  buildListingObservationSchedule,
  ClaimedListingObservationCheckpoint,
  CompletedListingObservationCheckpoint,
  DueListingObservationCheckpoint,
} from '../domain/listing-observation-schedule';
import {
  ListingMarketObservation,
  validateListingMarketObservation,
} from '../domain/listing-market-observation';

@Injectable()
export class PrismaSpotSymbolRepository implements SpotSymbolRepository {
  constructor(private readonly prisma: PrismaService) {}

  async observe(catalog: SpotSymbolCatalog): Promise<SpotSymbol[]> {
    if (catalog.symbols.length === 0) {
      return [];
    }

    const provider = catalog.symbols[0].provider;
    return this.prisma.$transaction(
      async (tx) => {
        const observed = await tx.observedSpotSymbol.findMany({
          where: { provider },
          select: { symbol: true },
        });
        const hadBaseline = observed.length > 0;
        const observedSymbols = new Set(observed.map(({ symbol }) => symbol));
        const newlyObserved = hadBaseline
          ? catalog.symbols.filter(({ symbol }) => !observedSymbols.has(symbol))
          : [];

        await Promise.all(
          catalog.symbols.map((symbol) =>
            tx.observedSpotSymbol.upsert({
              where: {
                provider_symbol: {
                  provider: symbol.provider,
                  symbol: symbol.symbol,
                },
              },
              create: {
                ...symbol,
                firstObservedAt: catalog.receivedAt,
                lastObservedAt: catalog.receivedAt,
                detectedAt: hadBaseline ? catalog.receivedAt : null,
              },
              update: {
                baseAsset: symbol.baseAsset,
                quoteAsset: symbol.quoteAsset,
                status: symbol.status,
                spotTradingAllowed: symbol.spotTradingAllowed,
                lastObservedAt: catalog.receivedAt,
              },
            }),
          ),
        );

        if (newlyObserved.length > 0) {
          await tx.listingObservationCheckpoint.createMany({
            data: newlyObserved.flatMap(({ provider, symbol }) =>
              buildListingObservationSchedule(catalog.receivedAt).map(
                ({ label, offsetMs, targetAt }) => ({
                  provider,
                  symbol,
                  label,
                  offsetMs,
                  targetAt,
                }),
              ),
            ),
            skipDuplicates: true,
          });
        }

        return newlyObserved;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  async findDetected(
    provider: SpotSymbol['provider'],
    symbol: string,
  ): Promise<DetectedSpotSymbol | null> {
    const row = await this.prisma.observedSpotSymbol.findUnique({
      where: { provider_symbol: { provider, symbol } },
    });
    if (!row?.detectedAt) return null;
    return toDetectedSpotSymbol(row);
  }

  async listDetected({
    limit,
    detectedFrom,
    detectedTo,
    provider,
    status,
    spotTradingAllowed,
    cursor,
  }: DetectedSpotSymbolQuery): Promise<DetectedSpotSymbol[]> {
    const rows = await this.prisma.observedSpotSymbol.findMany({
      where: {
        AND: [
          {
            ...(provider ? { provider } : {}),
            ...(status ? { status } : {}),
            ...(spotTradingAllowed !== undefined ? { spotTradingAllowed } : {}),
            detectedAt: {
              not: null,
              ...(detectedFrom ? { gte: detectedFrom } : {}),
              ...(detectedTo ? { lte: detectedTo } : {}),
            },
          },
          ...(cursor
            ? [
                {
                  OR: [
                    { detectedAt: { lt: cursor.detectedAt } },
                    {
                      detectedAt: cursor.detectedAt,
                      provider: { gt: cursor.provider },
                    },
                    {
                      detectedAt: cursor.detectedAt,
                      provider: cursor.provider,
                      symbol: { gt: cursor.symbol },
                    },
                  ],
                },
              ]
            : []),
        ],
      },
      orderBy: [{ detectedAt: 'desc' }, { provider: 'asc' }, { symbol: 'asc' }],
      take: limit,
    });
    return rows.map(toDetectedSpotSymbol);
  }

  async summarizeDetected({
    detectedFrom,
    detectedTo,
    provider,
    status,
    spotTradingAllowed,
  }: DetectedSpotSymbolFilters): Promise<DetectedSpotSymbolSummary> {
    const where = {
      ...(provider ? { provider } : {}),
      ...(status ? { status } : {}),
      ...(spotTradingAllowed !== undefined ? { spotTradingAllowed } : {}),
      detectedAt: {
        not: null,
        ...(detectedFrom ? { gte: detectedFrom } : {}),
        ...(detectedTo ? { lte: detectedTo } : {}),
      },
    } satisfies Prisma.ObservedSpotSymbolWhereInput;
    const [result, byStatus, bySpotTradingAllowed] =
      await this.prisma.$transaction([
        this.prisma.observedSpotSymbol.aggregate({
          where,
          _count: { _all: true },
          _min: { detectedAt: true },
          _max: { detectedAt: true },
        }),
        this.prisma.observedSpotSymbol.groupBy({
          by: ['status'],
          where,
          _count: { _all: true },
          orderBy: { status: 'asc' },
        }),
        this.prisma.observedSpotSymbol.groupBy({
          by: ['spotTradingAllowed'],
          where,
          _count: { _all: true },
          orderBy: { spotTradingAllowed: 'asc' },
        }),
      ]);
    return {
      count: result._count._all,
      firstDetectedAt: result._min.detectedAt,
      lastDetectedAt: result._max.detectedAt,
      byStatus: byStatus.map(({ status, _count }) => ({
        status,
        count: _count._all,
      })),
      bySpotTradingAllowed: bySpotTradingAllowed.map(
        ({ spotTradingAllowed, _count }) => ({
          spotTradingAllowed,
          count: _count._all,
        }),
      ),
    };
  }

  async listCompletedObservations(
    provider: SpotSymbol['provider'],
    symbol: string,
  ): Promise<CompletedListingObservationCheckpoint[]> {
    const rows = await this.prisma.listingObservationCheckpoint.findMany({
      where: { provider, symbol, completedAt: { not: null } },
      orderBy: [{ targetAt: 'asc' }, { label: 'asc' }],
    });
    return rows.map(toCompletedObservation);
  }

  async listCompletedObservationCohort(
    provider: SpotSymbol['provider'],
    limit: number,
  ): Promise<CompletedListingObservationCheckpoint[][]> {
    const detections = await this.prisma.observedSpotSymbol.findMany({
      where: {
        provider,
        detectedAt: { not: null },
        observationCheckpoints: {
          some: { label: 'T+0', completedAt: { not: null } },
        },
      },
      orderBy: [{ detectedAt: 'desc' }, { symbol: 'asc' }],
      take: limit,
      select: {
        observationCheckpoints: {
          where: { completedAt: { not: null } },
          orderBy: [{ targetAt: 'asc' }, { label: 'asc' }],
        },
      },
    });
    return detections.map(({ observationCheckpoints }) =>
      observationCheckpoints.map(toCompletedObservation),
    );
  }

  async listDueCheckpoints(
    dueAt: Date,
    limit: number,
  ): Promise<DueListingObservationCheckpoint[]> {
    const rows = await this.prisma.listingObservationCheckpoint.findMany({
      where: { targetAt: { lte: dueAt }, completedAt: null },
      orderBy: [
        { targetAt: 'asc' },
        { provider: 'asc' },
        { symbol: 'asc' },
        { label: 'asc' },
      ],
      take: limit,
    });
    return rows.map(({ symbol, label, offsetMs, targetAt }) => ({
      provider: 'binance',
      symbol,
      label: label as DueListingObservationCheckpoint['label'],
      offsetMs,
      targetAt,
    }));
  }

  async claimDueCheckpoints({
    dueAt,
    limit,
    claimToken,
    claimedAt,
    claimExpiresAt,
  }: {
    dueAt: Date;
    limit: number;
    claimToken: string;
    claimedAt: Date;
    claimExpiresAt: Date;
  }): Promise<ClaimedListingObservationCheckpoint[]> {
    const rows = await this.prisma.$queryRaw<ClaimedCheckpointRow[]>`
      WITH candidates AS (
        SELECT provider, symbol, label
        FROM listing_observation_checkpoints
        WHERE target_at <= ${dueAt}
          AND completed_at IS NULL
          AND (claim_expires_at IS NULL OR claim_expires_at <= ${claimedAt})
        ORDER BY target_at ASC, provider ASC, symbol ASC, label ASC
        FOR UPDATE SKIP LOCKED
        LIMIT ${limit}
      )
      UPDATE listing_observation_checkpoints AS checkpoint
      SET claim_token = ${claimToken},
          claimed_at = ${claimedAt},
          claim_expires_at = ${claimExpiresAt}
      FROM candidates
      WHERE checkpoint.provider = candidates.provider
        AND checkpoint.symbol = candidates.symbol
        AND checkpoint.label = candidates.label
      RETURNING checkpoint.provider,
                checkpoint.symbol,
                checkpoint.label,
                checkpoint.offset_ms AS "offsetMs",
                checkpoint.target_at AS "targetAt",
                checkpoint.claim_token AS "claimToken",
                checkpoint.claimed_at AS "claimedAt",
                checkpoint.claim_expires_at AS "claimExpiresAt"
    `;
    return rows
      .map((row) => ({
        ...row,
        provider: 'binance' as const,
        label: row.label as ClaimedListingObservationCheckpoint['label'],
      }))
      .sort(compareClaimedCheckpoints);
  }

  async completeClaimedCheckpoint({
    provider,
    symbol,
    label,
    claimToken,
    completedAt,
    observation,
  }: {
    provider: SpotSymbol['provider'];
    symbol: string;
    label: ClaimedListingObservationCheckpoint['label'];
    claimToken: string;
    completedAt: Date;
    observation: ListingMarketObservation;
  }): Promise<boolean> {
    const result = await this.prisma.listingObservationCheckpoint.updateMany({
      where: {
        provider,
        symbol,
        label,
        claimToken,
        claimedAt: { lte: completedAt },
        claimExpiresAt: { gt: completedAt },
        completedAt: null,
      },
      data: {
        completedAt,
        lastPrice: new Prisma.Decimal(observation.lastPrice),
        baseVolume: new Prisma.Decimal(observation.baseVolume),
        quoteVolume: new Prisma.Decimal(observation.quoteVolume),
        tradeCount: BigInt(observation.tradeCount),
        windowOpenTime: observation.windowOpenTime,
        windowCloseTime: observation.windowCloseTime,
        receivedAt: observation.receivedAt,
      },
    });
    return result.count === 1;
  }

  async completeClaimedCheckpointWithTopOfBook({
    provider,
    symbol,
    label,
    claimToken,
    completedAt,
    observation,
    topOfBook,
  }: {
    provider: SpotSymbol['provider'];
    symbol: string;
    label: ClaimedListingObservationCheckpoint['label'];
    claimToken: string;
    completedAt: Date;
    observation: ListingMarketObservation;
    topOfBook: import('../domain/listing-top-of-book-observation').ListingTopOfBookObservation;
  }): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.listingObservationCheckpoint.updateMany({
        where: {
          provider,
          symbol,
          label,
          claimToken,
          claimedAt: { lte: completedAt },
          claimExpiresAt: { gt: completedAt },
          completedAt: null,
        },
        data: {
          completedAt,
          lastPrice: new Prisma.Decimal(observation.lastPrice),
          baseVolume: new Prisma.Decimal(observation.baseVolume),
          quoteVolume: new Prisma.Decimal(observation.quoteVolume),
          tradeCount: BigInt(observation.tradeCount),
          windowOpenTime: observation.windowOpenTime,
          windowCloseTime: observation.windowCloseTime,
          receivedAt: observation.receivedAt,
        },
      });
      if (result.count !== 1) return false;
      await tx.listingCheckpointTopOfBook.create({
        data: {
          provider,
          symbol,
          label,
          updateId: topOfBook.updateId,
          bidPrice: topOfBook.bidPrice,
          bidQuantity: topOfBook.bidQuantity,
          askPrice: topOfBook.askPrice,
          askQuantity: topOfBook.askQuantity,
          receivedAt: topOfBook.receivedAt,
        },
      });
      return true;
    });
  }
}

interface ClaimedCheckpointRow {
  provider: string;
  symbol: string;
  label: string;
  offsetMs: number;
  targetAt: Date;
  claimToken: string;
  claimedAt: Date;
  claimExpiresAt: Date;
}

function compareClaimedCheckpoints(
  left: ClaimedListingObservationCheckpoint,
  right: ClaimedListingObservationCheckpoint,
): number {
  return (
    left.targetAt.getTime() - right.targetAt.getTime() ||
    left.provider.localeCompare(right.provider) ||
    left.symbol.localeCompare(right.symbol) ||
    left.label.localeCompare(right.label)
  );
}

function toDetectedSpotSymbol(row: {
  provider: string;
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  status: string;
  spotTradingAllowed: boolean;
  detectedAt: Date | null;
  lastObservedAt: Date;
}): DetectedSpotSymbol {
  return {
    provider: 'binance',
    symbol: row.symbol,
    baseAsset: row.baseAsset,
    quoteAsset: 'USDT',
    status: row.status,
    spotTradingAllowed: row.spotTradingAllowed,
    detectedAt: row.detectedAt!,
    lastObservedAt: row.lastObservedAt,
  };
}

function toCompletedObservation(row: {
  provider: string;
  symbol: string;
  label: string;
  offsetMs: number;
  targetAt: Date;
  completedAt: Date | null;
  lastPrice: Prisma.Decimal | null;
  baseVolume: Prisma.Decimal | null;
  quoteVolume: Prisma.Decimal | null;
  tradeCount: bigint | null;
  windowOpenTime: Date | null;
  windowCloseTime: Date | null;
  receivedAt: Date | null;
}): CompletedListingObservationCheckpoint {
  if (
    !row.completedAt ||
    !row.lastPrice ||
    !row.baseVolume ||
    !row.quoteVolume ||
    row.tradeCount === null ||
    !row.windowOpenTime ||
    !row.windowCloseTime ||
    !row.receivedAt
  ) {
    throw new Error('Completed listing observation is incomplete');
  }
  const observation: ListingMarketObservation = {
    provider: 'binance',
    symbol: row.symbol,
    lastPrice: row.lastPrice.toString(),
    baseVolume: row.baseVolume.toString(),
    quoteVolume: row.quoteVolume.toString(),
    tradeCount: Number(row.tradeCount),
    windowOpenTime: row.windowOpenTime,
    windowCloseTime: row.windowCloseTime,
    receivedAt: row.receivedAt,
  };
  validateListingMarketObservation(observation);
  return {
    label: row.label as CompletedListingObservationCheckpoint['label'],
    offsetMs: row.offsetMs,
    targetAt: row.targetAt,
    completedAt: row.completedAt,
    ...observation,
  };
}
