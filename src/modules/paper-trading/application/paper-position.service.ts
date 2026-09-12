import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LatestTopOfBookService } from '../../market-data/application/latest-top-of-book.service';
import { CLOCK, Clock } from '../../paper-wallet/domain/clock';
import {
  PAPER_EXECUTION_REPOSITORY,
  PaperExecutionRepository,
} from '../domain/paper-execution-repository';
import { PaperPosition } from '../domain/paper-position';
import { calculatePaperPosition } from './paper-position-calculator';
import { valuePaperPosition } from './paper-position-valuation';

export class PositionMarketDataUnavailableError extends Error {
  constructor() {
    super('Market data is unavailable for open-position valuation');
    this.name = PositionMarketDataUnavailableError.name;
  }
}

export class PositionMarketDataStaleError extends Error {
  constructor(
    readonly ageMs: number,
    readonly maxAgeMs: number,
  ) {
    super('Market data is stale for open-position valuation');
    this.name = PositionMarketDataStaleError.name;
  }
}

@Injectable()
export class PaperPositionService {
  constructor(
    @Inject(PAPER_EXECUTION_REPOSITORY)
    private readonly repository: PaperExecutionRepository,
    private readonly topOfBook: LatestTopOfBookService,
    private readonly config: ConfigService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async getPosition(): Promise<PaperPosition> {
    const position = calculatePaperPosition(
      await this.repository.listAllChronological(),
    );
    const feeRate = this.config.getOrThrow<string>('PAPER_TAKER_FEE_RATE');

    if (position.quantity === '0') {
      return valuePaperPosition(position, null, feeRate, null);
    }

    const book = this.topOfBook.getLatest();
    if (!book) throw new PositionMarketDataUnavailableError();

    const maxAgeMs = this.config.getOrThrow<number>(
      'PAPER_QUOTE_MAX_MARKET_DATA_AGE_MS',
    );
    const ageMs = Math.max(
      0,
      this.clock.now().getTime() - book.receivedAt.getTime(),
    );
    if (ageMs > maxAgeMs) {
      throw new PositionMarketDataStaleError(ageMs, maxAgeMs);
    }

    return valuePaperPosition(
      position,
      book.bidPrice,
      feeRate,
      book.receivedAt,
    );
  }
}
