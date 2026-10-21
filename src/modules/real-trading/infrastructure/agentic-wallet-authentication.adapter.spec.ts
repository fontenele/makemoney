import { jest } from '@jest/globals';
import {
  AgenticWalletAuthenticationAdapter,
  AgenticWalletAuthenticationCliProcessRunner,
  AgenticWalletAuthenticationRunner,
} from './agentic-wallet-authentication.adapter';

const STARTED_AT = new Date('2026-10-21T12:00:00.000Z');
const QR_CODE_ID = 'a191884d-0e05-435b-a887-336bc242fafc';

describe('AgenticWalletAuthenticationAdapter', () => {
  it('returns a bounded official Binance web challenge and verifies it', async () => {
    const runner = mockRunner({
      success: true,
      data: {
        urlForWeb:
          'https://web3.binance.com/en/agent-login?expireAt=1792584300000&url=opaque',
        qrCodeId: QR_CODE_ID,
        expireAt: '1792584300000',
        pairingCode: '654321',
      },
    });
    const adapter = new AgenticWalletAuthenticationAdapter(runner);

    await expect(adapter.start(STARTED_AT)).resolves.toEqual({
      status: 'awaiting_confirmation',
      urlForWeb:
        'https://web3.binance.com/en/agent-login?expireAt=1792584300000&url=opaque',
      qrCodeId: QR_CODE_ID,
      pairingCode: '654321',
      expiresAt: new Date('2026-10-21T12:05:00.000Z'),
    });
    await expect(adapter.verify(QR_CODE_ID)).resolves.toBeUndefined();
    expect(runner.verify.mock.calls).toEqual([[QR_CODE_ID, undefined]]);
  });

  it('reports an existing authenticated CLI session without a challenge', async () => {
    const adapter = new AgenticWalletAuthenticationAdapter(
      mockRunner({ success: true, data: { status: 'ALREADY_CONNECTED' } }),
    );
    await expect(adapter.start(STARTED_AT)).resolves.toEqual({
      status: 'already_connected',
    });
  });

  it.each([
    ['http://web3.binance.com/en/agent-login', QR_CODE_ID, '654321'],
    ['https://evil.example/agent-login', QR_CODE_ID, '654321'],
    [
      'https://web3.binance.com/en/agent-login',
      'not-a-canonical-uuid',
      '654321',
    ],
    ['https://web3.binance.com/en/agent-login', QR_CODE_ID, '123456<script>'],
  ])('rejects an unsafe or malformed challenge %#', async (url, id, code) => {
    const adapter = new AgenticWalletAuthenticationAdapter(
      mockRunner({
        success: true,
        data: {
          urlForWeb: url,
          qrCodeId: id,
          expireAt: '1792584300000',
          pairingCode: code,
        },
      }),
    );
    await expect(adapter.start(STARTED_AT)).rejects.toThrow();
  });

  it('rejects an expiry outside the bounded login window', async () => {
    const adapter = new AgenticWalletAuthenticationAdapter(
      mockRunner({
        success: true,
        data: {
          urlForWeb: 'https://web3.binance.com/en/agent-login',
          qrCodeId: QR_CODE_ID,
          expireAt: '1792587600000',
          pairingCode: '654321',
        },
      }),
    );
    await expect(adapter.start(STARTED_AT)).rejects.toThrow(
      'Agentic Wallet authentication expiry is invalid',
    );
  });
});

describe('AgenticWalletAuthenticationCliProcessRunner', () => {
  it('rejects a noncanonical verification identity before process access', async () => {
    const runner = new AgenticWalletAuthenticationCliProcessRunner('baw');
    await expect(runner.verify('unsafe value')).rejects.toThrow(
      'Agentic Wallet QR code identity is invalid',
    );
  });
});

function mockRunner(
  signInResult: unknown,
): AgenticWalletAuthenticationRunner & {
  signIn: jest.MockedFunction<AgenticWalletAuthenticationRunner['signIn']>;
  verify: jest.MockedFunction<AgenticWalletAuthenticationRunner['verify']>;
} {
  return {
    signIn: jest.fn(() => Promise.resolve(signInResult)),
    verify: jest.fn(() =>
      Promise.resolve({ success: true, data: { status: 'SUCCESS' } }),
    ),
  };
}
