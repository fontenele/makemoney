import { describe, expect, it } from 'vitest';
import { polymarketHistoricalAlignmentLabel } from './polymarket-price-change-context';

describe('polymarketHistoricalAlignmentLabel', () => {
  it.each([
    [true, true, 'Same time and resolution'],
    [true, false, 'Same time, different resolution'],
    [false, true, 'Different times, same resolution'],
    [false, false, 'Different times and resolutions'],
  ] as const)(
    'labels timestamp=%s and resolution=%s independently',
    (sameTimestamp, sameResolution, label) => {
      expect(
        polymarketHistoricalAlignmentLabel(sameTimestamp, sameResolution),
      ).toBe(label);
    },
  );
});
