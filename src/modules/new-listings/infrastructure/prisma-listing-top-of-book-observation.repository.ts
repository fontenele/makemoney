import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  ListingTopOfBookObservationRepository,
  StoredListingTopOfBookCheckpoint,
  StoreListingTopOfBookObservationRequest,
} from '../domain/listing-top-of-book-observation-repository';
import { LISTING_OBSERVATION_CHECKPOINTS } from '../domain/listing-observation-schedule';
import {
  ListingTopOfBookObservation,
  validateListingTopOfBookObservation,
} from '../domain/listing-top-of-book-observation';

@Injectable()
export class PrismaListingTopOfBookObservationRepository implements ListingTopOfBookObservationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async store({
    provider,
    symbol,
    label,
    observation,
  }: StoreListingTopOfBookObservationRequest): Promise<ListingTopOfBookObservation> {
    validateListingTopOfBookObservation(observation);
    if (observation.provider !== provider || observation.symbol !== symbol) {
      throw new Error('Listing top-of-book checkpoint identity mismatch');
    }

    return toObservation(
      await this.prisma.listingCheckpointTopOfBook.create({
        data: {
          provider,
          symbol,
          label,
          updateId: observation.updateId,
          bidPrice: observation.bidPrice,
          bidQuantity: observation.bidQuantity,
          askPrice: observation.askPrice,
          askQuantity: observation.askQuantity,
          receivedAt: observation.receivedAt,
        },
      }),
    );
  }

  async listForDetection(
    provider: ListingTopOfBookObservation['provider'],
    symbol: string,
  ): Promise<StoredListingTopOfBookCheckpoint[]> {
    if (provider !== 'binance' || !/^[A-Z0-9]{1,30}$/.test(symbol)) {
      throw new Error('Invalid listing top-of-book detection identity');
    }
    const rows = await this.prisma.listingCheckpointTopOfBook.findMany({
      where: { provider, symbol },
      include: {
        checkpoint: { select: { offsetMs: true, targetAt: true } },
      },
    });
    return rows.map(toStoredCheckpoint).sort((left, right) => {
      return left.offsetMs - right.offsetMs;
    });
  }
}

function toStoredCheckpoint(row: {
  provider: string;
  symbol: string;
  label: string;
  updateId: string;
  bidPrice: string;
  bidQuantity: string;
  askPrice: string;
  askQuantity: string;
  receivedAt: Date;
  checkpoint: { offsetMs: number; targetAt: Date };
}): StoredListingTopOfBookCheckpoint {
  const specification = LISTING_OBSERVATION_CHECKPOINTS.find(
    (checkpoint) => checkpoint.label === row.label,
  );
  if (
    !specification ||
    specification.offsetMs !== row.checkpoint.offsetMs ||
    !(row.checkpoint.targetAt instanceof Date) ||
    !Number.isFinite(row.checkpoint.targetAt.getTime())
  ) {
    throw new Error('Invalid persisted listing top-of-book checkpoint');
  }
  return {
    label: specification.label,
    offsetMs: specification.offsetMs,
    targetAt: row.checkpoint.targetAt,
    ...toObservation(row),
  };
}

function toObservation(row: {
  provider: string;
  symbol: string;
  updateId: string;
  bidPrice: string;
  bidQuantity: string;
  askPrice: string;
  askQuantity: string;
  receivedAt: Date;
}): ListingTopOfBookObservation {
  const observation: ListingTopOfBookObservation = {
    provider: row.provider as ListingTopOfBookObservation['provider'],
    symbol: row.symbol,
    updateId: row.updateId,
    bidPrice: row.bidPrice,
    bidQuantity: row.bidQuantity,
    askPrice: row.askPrice,
    askQuantity: row.askQuantity,
    receivedAt: row.receivedAt,
  };
  validateListingTopOfBookObservation(observation);
  return observation;
}
