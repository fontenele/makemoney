import { parseAgenticWalletCliJsonOutput } from './agentic-wallet-cli-json-process';

describe('CLI quota JSON decimal preservation', () => {
  it('preserves fractional used/remaining quota exactly as emitted by the CLI', () => {
    expect(
      parseAgenticWalletCliJsonOutput(
        '{"success":true,"data":{"quotaUsed":0.9983465393206,"quotaLeft":999.0016534606794,"dailyLimit":1000}}',
        true,
      ),
    ).toEqual({
      success: true,
      data: {
        quotaUsed: '0.9983465393206',
        quotaLeft: '999.0016534606794',
        dailyLimit: '1000',
      },
    });
  });
  it('preserves digits that JSON.parse would otherwise round before monetary validation', () => {
    expect(
      parseAgenticWalletCliJsonOutput(
        '{"quotaUsed":0.12345678901234567890123456789}',
        true,
      ),
    ).toEqual({ quotaUsed: '0.12345678901234567890123456789' });
  });
  it('normalizes bounded scientific notation without native floating-point arithmetic', () => {
    expect(
      parseAgenticWalletCliJsonOutput(
        '{"quotaUsed":1.234e-7,"quotaLeft":"999.1"}',
        true,
      ),
    ).toEqual({ quotaUsed: '0.0000001234', quotaLeft: '999.1' });
  });
  it.each(['-1', '1e30', '1e-40', '1e9999'])(
    'rejects invalid or unsupported quota quantity %s',
    (quantity) => {
      expect(() =>
        parseAgenticWalletCliJsonOutput('{"quotaUsed":' + quantity + '}', true),
      ).toThrow();
    },
  );
  it('does not rewrite other command responses or unrelated numeric fields', () => {
    expect(parseAgenticWalletCliJsonOutput('{"quotaUsed":0.5,"id":1}')).toEqual(
      { quotaUsed: 0.5, id: 1 },
    );
    expect(
      parseAgenticWalletCliJsonOutput('{"quotaUsed":"0.5","id":1}', true),
    ).toEqual({ quotaUsed: '0.5', id: 1 });
  });
  it('retains malformed JSON rejection', () => {
    expect(() =>
      parseAgenticWalletCliJsonOutput('{"quotaUsed":NaN}', true),
    ).toThrow();
  });
});
