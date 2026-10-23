import {
  isCanonicalBinanceAsset,
  isCanonicalBinanceSymbol,
} from './binance-spot-identity';

describe('Binance Spot identity', () => {
  it.each(['BTCUSDT', '币安人生USDT', '牛来USDT'])(
    'accepts canonical provider symbol %s',
    (symbol) => {
      expect(isCanonicalBinanceSymbol(symbol)).toBe(true);
    },
  );

  it.each(['BTC', '币安人生', '牛来'])(
    'accepts canonical provider asset %s',
    (asset) => {
      expect(isCanonicalBinanceAsset(asset)).toBe(true);
    },
  );

  it.each(['', 'btcusdt', 'BTC/USDT', 'E\u0301USDT', 'A'.repeat(31), null])(
    'rejects non-canonical provider symbol %#',
    (symbol) => {
      expect(isCanonicalBinanceSymbol(symbol)).toBe(false);
    },
  );

  it('keeps the asset limit independent from the symbol limit', () => {
    expect(isCanonicalBinanceAsset('A'.repeat(21))).toBe(false);
    expect(isCanonicalBinanceSymbol('A'.repeat(21))).toBe(true);
  });
});
