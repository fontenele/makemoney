import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { MarketTopOfBook } from '../domain/market-top-of-book';
import {
  TOP_OF_BOOK_STREAM,
  TopOfBookStream,
} from '../domain/top-of-book-stream';

@Injectable()
export class PublicTopOfBookService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PublicTopOfBookService.name);

  constructor(
    @Inject(TOP_OF_BOOK_STREAM)
    private readonly topOfBookStream: TopOfBookStream,
  ) {}

  onModuleInit(): void {
    this.topOfBookStream.start((topOfBook) => this.logTopOfBook(topOfBook));
  }

  onModuleDestroy(): void {
    this.topOfBookStream.stop();
  }

  private logTopOfBook(topOfBook: MarketTopOfBook): void {
    this.logger.log({
      event: 'market.top_of_book.received',
      provider: topOfBook.provider,
      symbol: topOfBook.symbol,
      updateId: topOfBook.updateId,
      bidPrice: topOfBook.bidPrice,
      bidQuantity: topOfBook.bidQuantity,
      askPrice: topOfBook.askPrice,
      askQuantity: topOfBook.askQuantity,
      receivedAt: topOfBook.receivedAt.toISOString(),
    });
  }
}
