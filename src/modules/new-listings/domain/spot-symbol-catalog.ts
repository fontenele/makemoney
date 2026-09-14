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

export const SPOT_SYMBOL_CATALOG_PROVIDER = Symbol(
  'SPOT_SYMBOL_CATALOG_PROVIDER',
);

export interface SpotSymbolCatalogProvider {
  load(signal?: AbortSignal): Promise<SpotSymbolCatalog>;
}

export const SPOT_SYMBOL_REPOSITORY = Symbol('SPOT_SYMBOL_REPOSITORY');

export interface SpotSymbolRepository {
  observe(catalog: SpotSymbolCatalog): Promise<SpotSymbol[]>;
}
