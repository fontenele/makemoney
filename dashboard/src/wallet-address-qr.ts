import QRCode from 'qrcode';

const EVM_ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/;

export async function buildWalletAddressQrCode(
  address: string,
): Promise<string> {
  if (!EVM_ADDRESS_PATTERN.test(address)) {
    throw new Error('Wallet address cannot be encoded as a QR code');
  }

  return QRCode.toDataURL(address, {
    type: 'image/png',
    errorCorrectionLevel: 'H',
    margin: 2,
    width: 280,
    color: {
      dark: '#111827',
      light: '#ffffff',
    },
  });
}
