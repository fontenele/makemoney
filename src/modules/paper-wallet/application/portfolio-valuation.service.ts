import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Decimal from 'decimal.js';
import { LatestMarketPriceService } from '../../market-data/application/latest-market-price.service';
import { PortfolioValuation } from '../domain/portfolio-valuation';
import { CLOCK, Clock } from '../domain/clock';
import { PaperWalletService } from './paper-wallet.service';

const ValuationDecimal = Decimal.clone({
  precision: 40,
  rounding: Decimal.ROUND_HALF_EVEN,
  toExpNeg: -40,
  toExpPos: 40,
});

const POSITIVE_DECIMAL_PATTERN = /^(0|[1-9]\d*)(\.\d+)?$/;

export class MarketPriceUnavailableError extends Error {
  constructor() {
    super('BTC/USDT market price is not available yet');
    this.name = MarketPriceUnavailableError.name;
  }
}

export class StaleMarketPriceError extends Error {
  constructor(
    readonly priceAgeMs: number,
    readonly maxPriceAgeMs: number,
  ) {
    super(
      `BTC/USDT market price is stale (${priceAgeMs}ms old; maximum ${maxPriceAgeMs}ms)`,
    );
    this.name = StaleMarketPriceError.name;
  }
}

@Injectable()
export class PortfolioValuationService {
  constructor(
    private readonly wallet: PaperWalletService,
    private readonly latestMarketPrice: LatestMarketPriceService,
    private readonly config: ConfigService,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  getValuation(): PortfolioValuation {
    const ticker = this.latestMarketPrice.getLatest();

    if (!ticker) {
      throw new MarketPriceUnavailableError();
    }

    const maxPriceAgeMs = this.config.getOrThrow<number>(
      'PAPER_VALUATION_MAX_PRICE_AGE_MS',
    );
    const priceAgeMs = Math.max(
      0,
      this.clock.now().getTime() - ticker.receivedAt.getTime(),
    );

    if (priceAgeMs > maxPriceAgeMs) {
      throw new StaleMarketPriceError(priceAgeMs, maxPriceAgeMs);
    }

    const btcPrice = parsePositivePrice(ticker.lastPrice);
    const balances = this.wallet.getBalances();
    const btcValue = new ValuationDecimal(balances.BTC).times(btcPrice);
    const totalValue = new ValuationDecimal(balances.USDT).plus(btcValue);

    return {
      quoteAsset: 'USDT',
      btcBalance: balances.BTC,
      btcPrice: btcPrice.toFixed(),
      btcValue: btcValue.toFixed(),
      usdtBalance: balances.USDT,
      totalValue: totalValue.toFixed(),
      pricedAt: ticker.eventTime,
    };
  }
}

function parsePositivePrice(value: string): Decimal {
  if (!POSITIVE_DECIMAL_PATTERN.test(value)) {
    throw new TypeError('Invalid BTC/USDT market price');
  }

  const price = new ValuationDecimal(value);

  if (price.lessThanOrEqualTo(0)) {
    throw new RangeError('BTC/USDT market price must be greater than zero');
  }

  return price;
}
