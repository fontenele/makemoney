import {
  buildListingObservationSchedule,
  LISTING_OBSERVATION_CHECKPOINTS,
} from './listing-observation-schedule';

describe('buildListingObservationSchedule', () => {
  it('builds the complete ordered schedule from the detection time', () => {
    const detectedAt = new Date('2026-09-14T12:00:00.000Z');

    const schedule = buildListingObservationSchedule(detectedAt);

    expect(
      schedule.map(({ label, offsetMs }) => ({ label, offsetMs })),
    ).toEqual(LISTING_OBSERVATION_CHECKPOINTS);
    expect(schedule.map(({ targetAt }) => targetAt.toISOString())).toEqual([
      '2026-09-14T12:00:00.000Z',
      '2026-09-14T12:00:05.000Z',
      '2026-09-14T12:00:10.000Z',
      '2026-09-14T12:00:30.000Z',
      '2026-09-14T12:01:00.000Z',
      '2026-09-14T12:05:00.000Z',
      '2026-09-14T12:15:00.000Z',
      '2026-09-14T13:00:00.000Z',
      '2026-09-15T12:00:00.000Z',
    ]);
  });

  it('returns independent dates without mutating the detection time', () => {
    const detectedAt = new Date('2026-09-14T12:00:00.000Z');
    const schedule = buildListingObservationSchedule(detectedAt);

    schedule[0].targetAt.setUTCFullYear(2030);

    expect(detectedAt.toISOString()).toBe('2026-09-14T12:00:00.000Z');
    expect(schedule[1].targetAt.toISOString()).toBe('2026-09-14T12:00:05.000Z');
  });

  it('rejects an invalid detection time', () => {
    expect(() => buildListingObservationSchedule(new Date('invalid'))).toThrow(
      'Detection time must be valid',
    );
  });
});
