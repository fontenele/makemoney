import { describe, expect, it } from 'vitest';
import { walletExpiryCountdown } from './wallet-session-expiry';

describe('walletExpiryCountdown', () => {
  it('formats the provider-owned deadline without resetting it locally', () => {
    expect(
      walletExpiryCountdown(
        '2026-10-11T03:32:11.000Z',
        new Date('2026-10-09T03:32:21.000Z').getTime(),
      ),
    ).toBe('1d 23h 59m 50s');
  });

  it('reports expiry and rejects malformed inputs', () => {
    const expiry = '2026-10-11T03:32:11.000Z';
    expect(
      walletExpiryCountdown(
        expiry,
        new Date('2026-10-11T03:32:11.000Z').getTime(),
      ),
    ).toBe('Expired');
    expect(walletExpiryCountdown('invalid', 0)).toBe('—');
  });
});
