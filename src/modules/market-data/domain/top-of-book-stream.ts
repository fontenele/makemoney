import { MarketTopOfBook } from './market-top-of-book';

export const TOP_OF_BOOK_STREAM = Symbol('TOP_OF_BOOK_STREAM');

export interface TopOfBookStream {
  start(onTopOfBook: (topOfBook: MarketTopOfBook) => void): void;
  stop(): void;
}
