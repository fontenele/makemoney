export interface SpotSymbol {
  provider: 'binance';
  symbol: string;
  baseAsset: string;
  quoteAsset: 'USDT';
  status: string;
  spotTradingAllowed: boolean;
}

export interface SpotSymbolCatalog {
  symbols: SpotSymbol[];
  receivedAt: Date;
}

export interface DetectedSpotSymbol extends SpotSymbol {
  detectedAt: Date;
  lastObservedAt: Date;
}

export interface DetectedSpotSymbolQuery {
  limit: number;
  detectedFrom?: Date;
  detectedTo?: Date;
  cursor?: Pick<DetectedSpotSymbol, 'provider' | 'symbol' | 'detectedAt'>;
}

export class DetectedSpotSymbolCursorNotFoundError extends Error {
  constructor() {
    super('Detected Spot symbol cursor was not found');
    this.name = DetectedSpotSymbolCursorNotFoundError.name;
  }
}

export const SPOT_SYMBOL_CATALOG_PROVIDER = Symbol(
  'SPOT_SYMBOL_CATALOG_PROVIDER',
);

export interface SpotSymbolCatalogProvider {
  load(signal?: AbortSignal): Promise<SpotSymbolCatalog>;
}

export const SPOT_SYMBOL_REPOSITORY = Symbol('SPOT_SYMBOL_REPOSITORY');
export const NEW_LISTINGS_POLL_INTERVAL_MS = Symbol(
  'NEW_LISTINGS_POLL_INTERVAL_MS',
);

export interface SpotSymbolRepository {
  observe(catalog: SpotSymbolCatalog): Promise<SpotSymbol[]>;
  findDetected(
    provider: SpotSymbol['provider'],
    symbol: string,
  ): Promise<DetectedSpotSymbol | null>;
  listDetected(query: DetectedSpotSymbolQuery): Promise<DetectedSpotSymbol[]>;
}
