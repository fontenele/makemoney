import { jest } from '@jest/globals';
import { HistoricalCandle } from '../../backtesting/domain/historical-candle';
import { MovingAverageCrossoverStrategy } from '../../strategies/application/moving-average-crossover.strategy';
import { Strategy } from '../../strategies/domain/strategy';
import { researchStrategyReturns } from './autonomous-strategy-research';
import { AutonomousStrategyResearchService } from './autonomous-strategy-research.service';

const end = new Date('2026-10-30T12:00:00Z');
function candles(count = 1000): HistoricalCandle[] {
  return Array.from({ length: count }, (_, i) => ({
    symbol: 'BTC/USDT',
    interval: '1m',
    isClosed: true,
    openTime: new Date(end.getTime() - (count - i) * 60000),
    closeTime: new Date(end.getTime() - (count - i - 1) * 60000 - 1),
    openPrice: '100',
    closePrice: '100',
    highPrice: '100',
    lowPrice: '100',
    baseVolume: '1',
    quoteVolume: '100',
    takerBuyBaseVolume: '0',
    takerBuyQuoteVolume: '0',
    tradeCount: 1,
  }));
}
const hold = () => new MovingAverageCrossoverStrategy();
describe('autonomous strategy research', () => {
  it('uses next opens and excludes the unclosed hypothetical position', () => {
    const data = candles(5);
    data[1].openPrice = '10';
    data[3].openPrice = '11';
    const actions = ['buy', 'hold', 'sell', 'buy', 'hold'] as const;
    let index = 0;
    const strategy = {
      requiredCandleCount: 6,
      analyze: () => ({ action: actions[index++] }),
    } as unknown as Strategy;
    expect(researchStrategyReturns(data, strategy)).toMatchObject({
      closedTradeCount: 1,
      grossMeanReturnRate: '0.1',
      openHypotheticalPosition: true,
      expectedProfitVerified: false,
      submissionAuthorized: false,
    });
  });
  it('does not invent an estimate without closed trades', () => {
    expect(researchStrategyReturns(candles(10), hold())).toMatchObject({
      closedTradeCount: 0,
      grossMeanReturnRate: null,
      grossLowerQuartileReturnRate: null,
    });
  });
  it('rejects gaps and invalid opens', () => {
    const data = candles(10);
    data.splice(4, 1);
    expect(() => researchStrategyReturns(data, hold())).toThrow();
    const invalid = candles(10);
    invalid[0].openPrice = '0';
    expect(() => researchStrategyReturns(invalid, hold())).toThrow();
  });
  it('bounds the research window', () => {
    expect(() => researchStrategyReturns(candles(1001), hold())).toThrow();
  });
  it('loads one fixed public window and never refreshes on read', async () => {
    const load = jest.fn(() => Promise.resolve(candles()));
    const service = new AutonomousStrategyResearchService(
      { load },
      hold(),
      () => end,
    );
    await service.refresh();
    expect(load).toHaveBeenCalledTimes(1);
    expect(load.mock.calls[0]).toBeDefined();
    expect(service.read()).toMatchObject({
      status: 'research_only',
      evidence: { candleCount: 1000 },
      walletAccessPerformed: false,
      submissionAuthorized: false,
    });
    const result = service.read();
    if (result.evidence) result.evidence.candleCount = 0;
    expect(service.read().evidence?.candleCount).toBe(1000);
    expect(load).toHaveBeenCalledTimes(1);
  });
  it('rejects incomplete provider windows', async () => {
    const service = new AutonomousStrategyResearchService(
      { load: () => Promise.resolve(candles(999)) },
      hold(),
      () => end,
    );
    await service.refresh();
    expect(service.read()).toMatchObject({
      status: 'unavailable',
      evidence: null,
    });
  });
  it('suppresses overlapping reads and ignores completion after shutdown', async () => {
    let complete!: (value: HistoricalCandle[]) => void;
    const load = jest.fn(
      () =>
        new Promise<HistoricalCandle[]>((resolve) => {
          complete = resolve;
        }),
    );
    const service = new AutonomousStrategyResearchService(
      { load },
      hold(),
      () => end,
    );
    const first = service.refresh();
    await service.refresh();
    expect(load).toHaveBeenCalledTimes(1);
    service.onModuleDestroy();
    complete(candles());
    await first;
    expect(service.read().evidence).toBeNull();
  });
  it('reports stale evidence and provider failures without promoting prior research', async () => {
    let at = end;
    const service = new AutonomousStrategyResearchService(
      { load: () => Promise.resolve(candles()) },
      hold(),
      () => at,
    );
    await service.refresh();
    at = new Date(end.getTime() + 960001);
    expect(service.read().status).toBe('warming_up_or_stale');
    await service.refresh();
    expect(service.read().status).toBe('unavailable');
  });
  it('schedules after completion and stops the background timer on destroy', async () => {
    jest.useFakeTimers();
    try {
      const load = jest.fn(() => Promise.resolve(candles()));
      const service = new AutonomousStrategyResearchService(
        { load },
        hold(),
        () => end,
      );
      service.onModuleInit();
      await Promise.resolve();
      await Promise.resolve();
      await jest.advanceTimersByTimeAsync(900000);
      expect(load).toHaveBeenCalledTimes(2);
      service.onModuleDestroy();
      await jest.advanceTimersByTimeAsync(900000);
      expect(load).toHaveBeenCalledTimes(2);
    } finally {
      jest.useRealTimers();
    }
  });
});
