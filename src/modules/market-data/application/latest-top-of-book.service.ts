import { Injectable } from '@nestjs/common';
import { MarketTopOfBook } from '../domain/market-top-of-book';

@Injectable()
export class LatestTopOfBookService {
  private value: MarketTopOfBook | undefined;

  update(value: MarketTopOfBook): void {
    this.value = value;
  }

  getLatest(): MarketTopOfBook | undefined {
    return this.value;
  }
}
