import { jest } from '@jest/globals';
import { AgenticWalletAuthenticationService } from './agentic-wallet-authentication.service';
import { AgenticWalletAuthenticationAdapter } from '../infrastructure/agentic-wallet-authentication.adapter';

const CHALLENGE = {
  status: 'awaiting_confirmation' as const,
  urlForWeb: 'https://web3.binance.com/en/agent-login?url=opaque',
  qrCodeId: 'a191884d-0e05-435b-a887-336bc242fafc',
  pairingCode: '654321',
  expiresAt: new Date('2026-10-21T12:05:00.000Z'),
};

describe('AgenticWalletAuthenticationService', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: new Date('2026-10-21T12:00:00.000Z') });
  });

  afterEach(() => jest.useRealTimers());

  it('starts one challenge, keeps verification alive, and exposes no QR identity', async () => {
    let confirm!: () => void;
    const verification = new Promise<void>((resolve) => {
      confirm = resolve;
    });
    const wallet = {
      start: jest.fn(() => Promise.resolve(CHALLENGE)),
      verify: jest.fn(() => verification),
    };
    const service = new AgenticWalletAuthenticationService(
      wallet as unknown as AgenticWalletAuthenticationAdapter,
    );

    const pending = await service.start();
    expect(pending).toMatchObject({
      status: 'awaiting_confirmation',
      pairingCode: '654321',
      urlForWeb: CHALLENGE.urlForWeb,
      quoteAuthorized: false,
      submissionAuthorized: false,
    });
    expect(pending).not.toHaveProperty('qrCodeId');
    await expect(service.start()).resolves.toEqual(pending);
    expect(wallet.start).toHaveBeenCalledTimes(1);
    expect(wallet.verify).toHaveBeenCalledTimes(1);

    jest.setSystemTime(new Date('2026-10-21T12:01:00.000Z'));
    confirm();
    await verification;
    await Promise.resolve();
    expect(service.getState()).toMatchObject({
      status: 'connected',
      pairingCode: null,
      urlForWeb: null,
      completedAt: new Date('2026-10-21T12:01:00.000Z'),
    });
  });

  it('coalesces concurrent sign-in starts', async () => {
    let resolveStart!: (value: typeof CHALLENGE) => void;
    const wallet = {
      start: jest.fn(
        () =>
          new Promise<typeof CHALLENGE>((resolve) => {
            resolveStart = resolve;
          }),
      ),
      verify: jest.fn(() => new Promise<void>(() => undefined)),
    };
    const service = new AgenticWalletAuthenticationService(
      wallet as unknown as AgenticWalletAuthenticationAdapter,
    );
    const first = service.start();
    const second = service.start();
    resolveStart(CHALLENGE);
    await expect(first).resolves.toEqual(await second);
    expect(wallet.start).toHaveBeenCalledTimes(1);
  });

  it('reports a sanitized failed state when verification fails', async () => {
    const wallet = {
      start: jest.fn(() => Promise.resolve(CHALLENGE)),
      verify: jest.fn(() =>
        Promise.reject(new Error('secret provider output')),
      ),
    };
    const service = new AgenticWalletAuthenticationService(
      wallet as unknown as AgenticWalletAuthenticationAdapter,
    );
    await service.start();
    await Promise.resolve();
    await Promise.resolve();
    expect(service.getState()).toMatchObject({
      status: 'failed',
      pairingCode: null,
      urlForWeb: null,
      quoteAuthorized: false,
      submissionAuthorized: false,
    });
    expect(JSON.stringify(service.getState())).not.toContain('secret');
  });
});
