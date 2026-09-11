import { MarketPairMetadata } from './market-pair-metadata';

export const PAIR_METADATA_PROVIDER = Symbol('PAIR_METADATA_PROVIDER');

export interface PairMetadataProvider {
  load(signal?: AbortSignal): Promise<MarketPairMetadata | null>;
}
