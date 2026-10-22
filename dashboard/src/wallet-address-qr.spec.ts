import { describe, expect, it } from 'vitest';
import { buildWalletAddressQrCode } from './wallet-address-qr';

describe('buildWalletAddressQrCode', () => {
  it('encodes one canonical EVM address as a local PNG data URL', async () => {
    const result = await buildWalletAddressQrCode(
      '0x1234567890abcdef1234567890abcdef12345678',
    );

    expect(result).toMatch(/^data:image\/png;base64,/);
    expect(result.length).toBeGreaterThan(500);
  });

  it.each([
    '',
    '0x1234',
    '1234567890abcdef1234567890abcdef12345678',
    '0x1234567890abcdef1234567890abcdef1234567g',
  ])('rejects unsafe address %j before QR generation', async (address) => {
    await expect(buildWalletAddressQrCode(address)).rejects.toThrow(
      'Wallet address cannot be encoded as a QR code',
    );
  });
});
