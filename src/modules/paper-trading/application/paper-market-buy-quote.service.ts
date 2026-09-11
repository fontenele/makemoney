import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Decimal from 'decimal.js';
import { LatestPairMetadataService } from '../../market-data/application/latest-pair-metadata.service';
import { LatestTopOfBookService } from '../../market-data/application/latest-top-of-book.service';
import { CLOCK, Clock } from '../../paper-wallet/domain/clock';
import { PaperMarketBuyQuote } from '../domain/paper-market-buy-quote';

const QuoteDecimal = Decimal.clone({
  precision: 40,
  rounding: Decimal.ROUND_HALF_EVEN,
  toExpNeg: -40,
  toExpPos: 40,
});
const DECIMAL_PATTERN = /^(0|[1-9]\d{0,39})(\.\d{1,40})?$/;

export class PaperQuoteRejectedError extends Error {
  constructor(readonly reason: string) {
    super(`Paper buy quote rejected: ${reason}`);
    this.name = PaperQuoteRejectedError.name;
  }
}

@Injectable()
export class PaperMarketBuyQuoteService {
  private readonly logger = new Logger(PaperMarketBuyQuoteService.name);

  constructor(
    private readonly topOfBook: LatestTopOfBookService,
    private readonly pairMetadata: LatestPairMetadataService,
    private readonly config: ConfigService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  quote(quantityValue: string): PaperMarketBuyQuote {
    const quantity = positiveDecimal(quantityValue, 'invalid_quantity');
    const book = this.topOfBook.getLatest();
    const metadata = this.pairMetadata.getLatest();

    if (!book) throw new PaperQuoteRejectedError('top_of_book_unavailable');
    if (!metadata) throw new PaperQuoteRejectedError('metadata_unavailable');
    if (metadata.status !== 'TRADING') {
      throw new PaperQuoteRejectedError('pair_not_trading');
    }

    const now = this.clock.now();
    const maxAgeMs = this.config.getOrThrow<number>(
      'PAPER_QUOTE_MAX_MARKET_DATA_AGE_MS',
    );
    const ageMs = Math.max(0, now.getTime() - book.receivedAt.getTime());
    if (ageMs > maxAgeMs) {
      throw new PaperQuoteRejectedError('top_of_book_stale');
    }

    const askPrice = positiveDecimal(book.askPrice, 'invalid_ask_price');
    const askQuantity = positiveDecimal(
      book.askQuantity,
      'invalid_ask_liquidity',
    );
    const minQuantity = positiveDecimal(
      metadata.minQuantity,
      'invalid_metadata',
    );
    const maxQuantity = positiveDecimal(
      metadata.maxQuantity,
      'invalid_metadata',
    );
    const stepSize = positiveDecimal(metadata.stepSize, 'invalid_metadata');
    const minNotional = positiveDecimal(
      metadata.minNotional,
      'invalid_metadata',
    );

    if (quantity.lessThan(minQuantity))
      throw new PaperQuoteRejectedError('below_min_quantity');
    if (quantity.greaterThan(maxQuantity))
      throw new PaperQuoteRejectedError('above_max_quantity');
    if (!quantity.modulo(stepSize).isZero())
      throw new PaperQuoteRejectedError('invalid_step_size');
    if (quantity.greaterThan(askQuantity))
      throw new PaperQuoteRejectedError('insufficient_top_of_book_liquidity');

    const notional = quantity.times(askPrice);
    if (notional.lessThan(minNotional))
      throw new PaperQuoteRejectedError('below_min_notional');

    const feeRate = decimal(
      this.config.getOrThrow<string>('PAPER_TAKER_FEE_RATE'),
      'invalid_fee_rate',
    );
    if (feeRate.isNegative() || feeRate.greaterThanOrEqualTo(1))
      throw new PaperQuoteRejectedError('invalid_fee_rate');

    const fee = notional.times(feeRate);
    const quote = {
      symbol: 'BTC/USDT' as const,
      side: 'buy' as const,
      quantity: quantity.toFixed(),
      price: askPrice.toFixed(),
      notional: notional.toFixed(),
      feeRate: feeRate.toFixed(),
      fee: fee.toFixed(),
      totalCost: notional.plus(fee).toFixed(),
      quotedAt: now,
      marketDataReceivedAt: book.receivedAt,
    };
    this.logger.log({ event: 'paper_trade.buy_quoted', ...quote });
    return quote;
  }
}

function positiveDecimal(value: string, reason: string): Decimal {
  const valueAsDecimal = decimal(value, reason);
  if (valueAsDecimal.lessThanOrEqualTo(0))
    throw new PaperQuoteRejectedError(reason);
  return valueAsDecimal;
}

function decimal(value: string, reason: string): Decimal {
  if (!DECIMAL_PATTERN.test(value)) throw new PaperQuoteRejectedError(reason);
  return new QuoteDecimal(value);
}
