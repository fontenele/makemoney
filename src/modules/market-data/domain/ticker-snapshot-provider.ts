import { MarketTicker } from './market-ticker';

export const TICKER_SNAPSHOT_PROVIDER = Symbol('TICKER_SNAPSHOT_PROVIDER');

export interface TickerSnapshotProvider {
  load(signal?: AbortSignal): Promise<MarketTicker | null>;
}
