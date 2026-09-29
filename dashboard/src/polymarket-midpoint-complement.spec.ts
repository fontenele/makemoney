import { describe, expect, it } from 'vitest';
import { polymarketMidpointComplementStatusLabel } from './polymarket-midpoint-complement';

describe('polymarketMidpointComplementStatusLabel', () => {
  it.each([
    ['balanced', 'Equal to one'],
    ['below_one', 'Below one'],
    ['above_one', 'Above one'],
  ] as const)(
    'labels %s without adding an economic interpretation',
    (status, label) => {
      expect(polymarketMidpointComplementStatusLabel(status)).toBe(label);
    },
  );
});
