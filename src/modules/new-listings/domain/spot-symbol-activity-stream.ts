import { SpotSymbol } from './spot-symbol-catalog';

export interface SpotSymbolActivity {
  provider: SpotSymbol['provider'];
  symbol: string;
  eventTime: Date;
  receivedAt: Date;
}

export type SpotSymbolActivityStreamEvent =
  | { type: 'connected'; observedAt: Date }
  | {
      type: 'disconnected';
      observedAt: Date;
      reconnectAttempt: number;
      reconnectDelayMs: number;
    }
  | { type: 'activity'; activity: SpotSymbolActivity };

export interface SpotSymbolActivityStreamStatus {
  state: 'starting' | 'connected' | 'reconnecting' | 'stopped';
  lastConnectedAt: Date | null;
  lastEventAt: Date | null;
  lastTriggeredRefreshAt: Date | null;
  lastTriggeredSymbol: string | null;
  triggeredRefreshCount: number;
  reconnectCount: number;
}

export interface SpotSymbolActivityStream {
  start(observer: (event: SpotSymbolActivityStreamEvent) => void): void;
  stop(): void;
}

export const SPOT_SYMBOL_ACTIVITY_STREAM = Symbol(
  'SPOT_SYMBOL_ACTIVITY_STREAM',
);
