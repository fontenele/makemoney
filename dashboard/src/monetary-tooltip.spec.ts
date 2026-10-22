import { describe, expect, it } from 'vitest';
import { buildMonetaryTooltip } from './monetary-tooltip';

const rates = {
  bnbUsdt: '742.19000000',
  btcUsdt: '68000',
  usdtBrl: '5.04450000',
};

describe('buildMonetaryTooltip', () => {
  it('shows USDT and BRL equivalents for a non-USDT crypto amount', () => {
    expect(buildMonetaryTooltip('0.00975323', 'BNB', rates)).toBe(
      'Equivalent: 7.24 USDT · R$ 36,52',
    );
  });

  it('shows BRL for USDT and USDT for BRL', () => {
    expect(buildMonetaryTooltip('10', 'USDT', rates)).toBe(
      'Equivalent: R$ 50,45',
    );
    expect(buildMonetaryTooltip('50.445', 'BRL', rates)).toBe(
      'Equivalent: 10.00 USDT',
    );
  });

  it('uses the available BTC market price without floating-point arithmetic', () => {
    expect(buildMonetaryTooltip('0.0001', 'BTC', rates)).toBe(
      'Equivalent: 6.80 USDT · R$ 34,30',
    );
  });

  it('omits a tooltip when an amount or required price is invalid', () => {
    expect(buildMonetaryTooltip('invalid', 'USDT', rates)).toBeUndefined();
    expect(
      buildMonetaryTooltip('1', 'BNB', { usdtBrl: '5.0445' }),
    ).toBeUndefined();
    expect(buildMonetaryTooltip('1', 'USDT', { usdtBrl: '0' })).toBeUndefined();
  });

  it('preserves the sign when converting a loss', () => {
    expect(buildMonetaryTooltip('-2', 'USDT', rates)).toBe(
      'Equivalent: -R$ 10,09',
    );
  });
});
