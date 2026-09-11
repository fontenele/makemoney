import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Decimal from 'decimal.js';
import { LatestPairMetadataService } from '../../market-data/application/latest-pair-metadata.service';
import { LatestTopOfBookService } from '../../market-data/application/latest-top-of-book.service';
import { CLOCK, Clock } from '../../paper-wallet/domain/clock';
import { PaperMarketSellQuote } from '../domain/paper-market-sell-quote';

const QuoteDecimal = Decimal.clone({
  precision: 40,
  rounding: Decimal.ROUND_HALF_EVEN,
  toExpNeg: -40,
  toExpPos: 40,
});
const DECIMAL_PATTERN = /^(0|[1-9]\d{0,19})(\.\d{1,18})?$/;
const MONEY_SCALE = 18;

export class PaperSellQuoteRejectedError extends Error {
  constructor(readonly reason: string) {
    super(`Paper sell quote rejected: ${reason}`);
    this.name = PaperSellQuoteRejectedError.name;
  }
}

@Injectable()
export class PaperMarketSellQuoteService {
  private readonly logger = new Logger(PaperMarketSellQuoteService.name);

  constructor(
    private readonly topOfBook: LatestTopOfBookService,
    private readonly pairMetadata: LatestPairMetadataService,
    private readonly config: ConfigService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  quote(quantityValue: string): PaperMarketSellQuote {
    const quantity = positiveDecimal(quantityValue, 'invalid_quantity');
    const book = this.topOfBook.getLatest();
    const metadata = this.pairMetadata.getLatest();

    if (!book) throw new PaperSellQuoteRejectedError('top_of_book_unavailable');
    if (!metadata)
      throw new PaperSellQuoteRejectedError('metadata_unavailable');
    if (metadata.status !== 'TRADING') {
      throw new PaperSellQuoteRejectedError('pair_not_trading');
    }

    const now = this.clock.now();
    const maxAgeMs = this.config.getOrThrow<number>(
      'PAPER_QUOTE_MAX_MARKET_DATA_AGE_MS',
    );
    const ageMs = Math.max(0, now.getTime() - book.receivedAt.getTime());
    if (ageMs > maxAgeMs) {
      throw new PaperSellQuoteRejectedError('top_of_book_stale');
    }

    const bidPrice = positiveDecimal(book.bidPrice, 'invalid_bid_price');
    const bidQuantity = positiveDecimal(
      book.bidQuantity,
      'invalid_bid_liquidity',
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
      throw new PaperSellQuoteRejectedError('below_min_quantity');
    if (quantity.greaterThan(maxQuantity))
      throw new PaperSellQuoteRejectedError('above_max_quantity');
    if (!quantity.modulo(stepSize).isZero())
      throw new PaperSellQuoteRejectedError('invalid_step_size');
    if (quantity.greaterThan(bidQuantity))
      throw new PaperSellQuoteRejectedError(
        'insufficient_top_of_book_liquidity',
      );

    const notional = quantity
      .times(bidPrice)
      .toDecimalPlaces(MONEY_SCALE, Decimal.ROUND_HALF_EVEN);
    if (notional.lessThan(minNotional))
      throw new PaperSellQuoteRejectedError('below_min_notional');

    const feeRate = decimal(
      this.config.getOrThrow<string>('PAPER_TAKER_FEE_RATE'),
      'invalid_fee_rate',
    );
    if (feeRate.isNegative() || feeRate.greaterThanOrEqualTo(1))
      throw new PaperSellQuoteRejectedError('invalid_fee_rate');

    const fee = notional
      .times(feeRate)
      .toDecimalPlaces(MONEY_SCALE, Decimal.ROUND_HALF_EVEN);
    const quote = {
      symbol: 'BTC/USDT' as const,
      side: 'sell' as const,
      quantity: quantity.toFixed(),
      price: bidPrice.toFixed(),
      notional: notional.toFixed(),
      feeRate: feeRate.toFixed(),
      fee: fee.toFixed(),
      netProceeds: notional
        .minus(fee)
        .toDecimalPlaces(MONEY_SCALE, Decimal.ROUND_HALF_EVEN)
        .toFixed(),
      quotedAt: now,
      marketDataReceivedAt: book.receivedAt,
    };
    this.logger.log({ event: 'paper_trade.sell_quoted', ...quote });
    return quote;
  }
}

function positiveDecimal(value: string, reason: string): Decimal {
  const valueAsDecimal = decimal(value, reason);
  if (valueAsDecimal.lessThanOrEqualTo(0))
    throw new PaperSellQuoteRejectedError(reason);
  return valueAsDecimal;
}

function decimal(value: string, reason: string): Decimal {
  if (!DECIMAL_PATTERN.test(value))
    throw new PaperSellQuoteRejectedError(reason);
  return new QuoteDecimal(value);
}
