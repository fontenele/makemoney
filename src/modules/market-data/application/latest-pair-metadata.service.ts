import { Injectable } from '@nestjs/common';
import { MarketPairMetadata } from '../domain/market-pair-metadata';

@Injectable()
export class LatestPairMetadataService {
  private value: MarketPairMetadata | undefined;

  update(value: MarketPairMetadata): void {
    this.value = value;
  }

  getLatest(): MarketPairMetadata | undefined {
    return this.value;
  }
}
