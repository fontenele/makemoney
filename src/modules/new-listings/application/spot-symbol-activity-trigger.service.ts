import {
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  SPOT_SYMBOL_ACTIVITY_STREAM,
  SpotSymbolActivityStream,
  SpotSymbolActivityStreamEvent,
  SpotSymbolActivityStreamStatus,
} from '../domain/spot-symbol-activity-stream';
import { SpotSymbolCatalogService } from './spot-symbol-catalog.service';

const SYMBOL_TRIGGER_COOLDOWN_MS = 60_000;

@Injectable()
export class SpotSymbolActivityTriggerService
  implements OnModuleInit, OnModuleDestroy
{
  private readonly triggeredAtBySymbol = new Map<string, number>();
  private state: SpotSymbolActivityStreamStatus['state'] = 'starting';
  private lastConnectedAt: Date | null = null;
  private lastEventAt: Date | null = null;
  private lastTriggeredRefreshAt: Date | null = null;
  private lastTriggeredSymbol: string | null = null;
  private triggeredRefreshCount = 0;
  private reconnectCount = 0;

  constructor(
    @Inject(SPOT_SYMBOL_ACTIVITY_STREAM)
    private readonly stream: SpotSymbolActivityStream,
    private readonly catalog: SpotSymbolCatalogService,
  ) {}

  onModuleInit(): void {
    this.stream.start((event) => this.observe(event));
  }

  onModuleDestroy(): void {
    this.stream.stop();
    this.state = 'stopped';
  }

  status(): SpotSymbolActivityStreamStatus {
    return {
      state: this.state,
      lastConnectedAt: this.lastConnectedAt,
      lastEventAt: this.lastEventAt,
      lastTriggeredRefreshAt: this.lastTriggeredRefreshAt,
      lastTriggeredSymbol: this.lastTriggeredSymbol,
      triggeredRefreshCount: this.triggeredRefreshCount,
      reconnectCount: this.reconnectCount,
    };
  }

  private observe(event: SpotSymbolActivityStreamEvent): void {
    if (event.type === 'connected') {
      this.state = 'connected';
      this.lastConnectedAt = event.observedAt;
      return;
    }
    if (event.type === 'disconnected') {
      this.state = 'reconnecting';
      this.reconnectCount += 1;
      return;
    }

    this.lastEventAt = event.activity.receivedAt;
    const now = event.activity.receivedAt.getTime();
    const previouslyTriggeredAt = this.triggeredAtBySymbol.get(
      event.activity.symbol,
    );
    if (
      previouslyTriggeredAt !== undefined &&
      now - previouslyTriggeredAt < SYMBOL_TRIGGER_COOLDOWN_MS
    ) {
      return;
    }
    if (!this.catalog.requestActivityRefresh(event.activity.symbol)) return;

    this.triggeredAtBySymbol.set(event.activity.symbol, now);
    this.pruneCooldowns(now);
    this.lastTriggeredRefreshAt = event.activity.receivedAt;
    this.lastTriggeredSymbol = event.activity.symbol;
    this.triggeredRefreshCount += 1;
  }

  private pruneCooldowns(now: number): void {
    for (const [symbol, triggeredAt] of this.triggeredAtBySymbol) {
      if (now - triggeredAt >= SYMBOL_TRIGGER_COOLDOWN_MS) {
        this.triggeredAtBySymbol.delete(symbol);
      }
    }
  }
}
