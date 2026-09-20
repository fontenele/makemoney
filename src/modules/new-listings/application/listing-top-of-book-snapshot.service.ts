import {
  ListingTopOfBookObservationProvider,
  ListingTopOfBookObservationRequest,
} from '../domain/listing-top-of-book-observation';
import { ListingTopOfBookSpread } from '../domain/listing-top-of-book-spread';
import { ListingTopOfBookSpreadCalculator } from './listing-top-of-book-spread-calculator';

export class ListingTopOfBookSnapshotService {
  constructor(
    private readonly provider: ListingTopOfBookObservationProvider,
    private readonly calculator: ListingTopOfBookSpreadCalculator,
  ) {}

  async load(
    request: ListingTopOfBookObservationRequest,
    signal?: AbortSignal,
  ): Promise<ListingTopOfBookSpread> {
    const observation = await this.provider.load(request, signal);
    return this.calculator.calculate(observation);
  }
}
