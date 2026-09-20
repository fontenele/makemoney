import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  ListingTopOfBookObservationRepository,
  StoreListingTopOfBookObservationRequest,
} from '../domain/listing-top-of-book-observation-repository';
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
