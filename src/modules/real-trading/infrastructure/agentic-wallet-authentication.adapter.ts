import { AgenticWalletCliJsonProcess } from './agentic-wallet-cli-json-process';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const PAIRING_CODE_PATTERN = /^[A-Za-z0-9]{6}$/;
const APPROVED_AUTHENTICATION_HOSTS = new Set([
  'app.binance.com',
  'web3.binance.com',
]);
const MAX_WEB_URL_LENGTH = 2048;
const MAX_FLOW_DURATION_MS = 10 * 60 * 1000;

export interface AgenticWalletAuthenticationChallenge {
  readonly status: 'awaiting_confirmation';
  readonly urlForWeb: string;
  readonly qrCodeId: string;
  readonly pairingCode: string;
  readonly expiresAt: Date;
}

export type AgenticWalletAuthenticationStart =
  | { readonly status: 'already_connected' }
  | AgenticWalletAuthenticationChallenge;

export interface AgenticWalletAuthenticationRunner {
  signIn(signal?: AbortSignal): Promise<unknown>;
  verify(qrCodeId: string, signal?: AbortSignal): Promise<unknown>;
}

export class AgenticWalletAuthenticationAdapter {
  constructor(private readonly runner: AgenticWalletAuthenticationRunner) {}

  async start(
    startedAt: Date,
    signal?: AbortSignal,
  ): Promise<AgenticWalletAuthenticationStart> {
    validateDate(startedAt);
    const data = envelopeData(await this.runner.signIn(signal));
    if (data.status === 'ALREADY_CONNECTED') {
      return { status: 'already_connected' };
    }

    const urlForWeb = authenticationUrl(data.urlForWeb);
    const qrCodeId = requiredString(data.qrCodeId, 'QR code identity');
    const pairingCode = requiredString(data.pairingCode, 'pairing code');
    const expiresAt = epochDate(data.expireAt);
    if (!UUID_PATTERN.test(qrCodeId)) {
      throw new Error('Agentic Wallet QR code identity is invalid');
    }
    if (!PAIRING_CODE_PATTERN.test(pairingCode)) {
      throw new Error('Agentic Wallet pairing code is invalid');
    }
    if (
      expiresAt.getTime() <= startedAt.getTime() ||
      expiresAt.getTime() - startedAt.getTime() > MAX_FLOW_DURATION_MS
    ) {
      throw new Error('Agentic Wallet authentication expiry is invalid');
    }
    return {
      status: 'awaiting_confirmation',
      urlForWeb,
      qrCodeId,
      pairingCode,
      expiresAt,
    };
  }

  async verify(qrCodeId: string, signal?: AbortSignal): Promise<void> {
    if (!UUID_PATTERN.test(qrCodeId)) {
      throw new Error('Agentic Wallet QR code identity is invalid');
    }
    const data = envelopeData(await this.runner.verify(qrCodeId, signal));
    if (data.status !== 'SUCCESS') {
      throw new Error('Agentic Wallet authentication was not confirmed');
    }
  }
}

export class AgenticWalletAuthenticationCliProcessRunner implements AgenticWalletAuthenticationRunner {
  private readonly signInProcess: AgenticWalletCliJsonProcess;
  private readonly verifyProcess: AgenticWalletCliJsonProcess;

  constructor(executable?: string) {
    this.signInProcess = new AgenticWalletCliJsonProcess(
      'authentication',
      30000,
      executable,
    );
    this.verifyProcess = new AgenticWalletCliJsonProcess(
      'authentication',
      305000,
      executable,
      310000,
    );
  }

  signIn(signal?: AbortSignal): Promise<unknown> {
    return this.signInProcess.run(['auth', 'signin', '--json'], signal);
  }

  verify(qrCodeId: string, signal?: AbortSignal): Promise<unknown> {
    if (!UUID_PATTERN.test(qrCodeId)) {
      return Promise.reject(
        new Error('Agentic Wallet QR code identity is invalid'),
      );
    }
    return this.verifyProcess.run(
      ['auth', 'verify', '--qrCodeId', qrCodeId, '--json'],
      signal,
    );
  }
}

function envelopeData(value: unknown): Record<string, unknown> {
  const envelope = record(value);
  if (envelope.success !== true) {
    throw new Error('Agentic Wallet authentication command was unsuccessful');
  }
  return record(envelope.data);
}

function authenticationUrl(value: unknown): string {
  const raw = requiredString(value, 'authentication URL');
  if (raw.length > MAX_WEB_URL_LENGTH) {
    throw new Error('Agentic Wallet authentication URL is invalid');
  }
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error('Agentic Wallet authentication URL is invalid');
  }
  if (
    parsed.protocol !== 'https:' ||
    !APPROVED_AUTHENTICATION_HOSTS.has(parsed.hostname) ||
    parsed.username !== '' ||
    parsed.password !== '' ||
    parsed.hash !== ''
  ) {
    throw new Error('Agentic Wallet authentication URL is invalid');
  }
  return raw;
}

function epochDate(value: unknown): Date {
  const raw = typeof value === 'number' ? value.toString() : value;
  if (typeof raw !== 'string' || !/^\d{13}$/.test(raw)) {
    throw new Error('Agentic Wallet authentication expiry is invalid');
  }
  const date = new Date(Number(raw));
  validateDate(date);
  return date;
}

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Agentic Wallet authentication response is invalid');
  }
  return value as Record<string, unknown>;
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Agentic Wallet ${field} is invalid`);
  }
  return value;
}

function validateDate(value: Date): void {
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) {
    throw new Error('Agentic Wallet authentication date is invalid');
  }
}
