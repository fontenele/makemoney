import {
  PredictionEventLiveVolumeIncoherentError,
  PredictionEventLiveVolumeProvider,
} from '../domain/prediction-event-live-volume';
import type { PredictionEventProvider } from '../domain/prediction-event';
import { PredictionEventService } from './prediction-event.service';
import { PredictionEventLiveVolumeService } from './prediction-event-live-volume.service';

describe('PredictionEventLiveVolumeService', () => {
  it('joins selected-event provenance to its exact activity breakdown', async () => {
    const receivedAt = new Date('2026-09-28T05:00:00.000Z');
    const service = createService(event(), {
      provider: 'polymarket',
      eventId: '1000',
      takerVolumeTotalShares: '15.5',
      markets: [
        { conditionId: conditionId('a'), takerVolumeShares: '10' },
        { conditionId: conditionId('b'), takerVolumeShares: '5.5' },
      ],
      source: 'data-api-live-volume',
      receivedAt,
    });

    await expect(service.getLiveVolume('1000')).resolves.toMatchObject({
      event: event(),
      takerVolumeTotalShares: '15.5',
      executable: false,
    });
  });

  it('rejects event identity divergence', async () => {
    const service = createService(event(), observation({ eventId: '1001' }));

    await expect(service.getLiveVolume('1000')).rejects.toThrow(
      PredictionEventLiveVolumeIncoherentError,
    );
  });

  it('rejects a returned condition outside the selected event', async () => {
    const service = createService(
      event(),
      observation({
        markets: [{ conditionId: conditionId('c'), takerVolumeShares: '15.5' }],
      }),
    );

    await expect(service.getLiveVolume('1000')).rejects.toThrow(
      PredictionEventLiveVolumeIncoherentError,
    );
  });

  it('allows an explicitly unidentified provider source row', async () => {
    const service = createService(
      event(),
      observation({
        markets: [{ conditionId: null, takerVolumeShares: '15.5' }],
      }),
    );

    await expect(service.getLiveVolume('1000')).resolves.toMatchObject({
      markets: [{ conditionId: null, takerVolumeShares: '15.5' }],
    });
  });
});

function createService(
  details: ReturnType<typeof event>,
  volume: Awaited<
    ReturnType<PredictionEventLiveVolumeProvider['getLiveVolume']>
  >,
) {
  const events = new PredictionEventService({
    getById: () => Promise.resolve(details),
  } as PredictionEventProvider);
  return new PredictionEventLiveVolumeService(events, {
    getLiveVolume: () => Promise.resolve(volume),
  });
}

function observation(
  overrides: Partial<
    Awaited<ReturnType<PredictionEventLiveVolumeProvider['getLiveVolume']>>
  > = {},
) {
  return {
    provider: 'polymarket' as const,
    eventId: '1000',
    takerVolumeTotalShares: '15.5',
    markets: [{ conditionId: conditionId('a'), takerVolumeShares: '15.5' }],
    source: 'data-api-live-volume' as const,
    receivedAt: new Date('2026-09-28T05:00:00.000Z'),
    ...overrides,
  };
}

function event() {
  return {
    provider: 'polymarket' as const,
    id: '1000',
    slug: 'example-event',
    title: 'Example event',
    description: null,
    resolutionSource: null,
    startDate: null,
    endDate: null,
    active: true,
    closed: false,
    archived: false,
    restricted: false,
    markets: [market('1', conditionId('a')), market('2', conditionId('b'))],
    receivedAt: new Date('2026-09-28T04:59:00.000Z'),
  };
}

function market(id: string, conditionIdValue: string) {
  return {
    id,
    slug: null,
    question: null,
    conditionId: conditionIdValue,
    closed: false,
  };
}

function conditionId(character: string): string {
  return `0x${character.repeat(64)}`;
}
