import { Injectable } from '@nestjs/common';
import {
  AgenticWalletAuthenticationAdapter,
  AgenticWalletAuthenticationChallenge,
} from '../infrastructure/agentic-wallet-authentication.adapter';

export interface AgenticWalletAuthenticationState {
  readonly scope: 'agentic_wallet_authentication';
  readonly status:
    | 'idle'
    | 'awaiting_confirmation'
    | 'connected'
    | 'already_connected'
    | 'failed';
  readonly pairingCode: string | null;
  readonly urlForWeb: string | null;
  readonly expiresAt: Date | null;
  readonly startedAt: Date | null;
  readonly completedAt: Date | null;
  readonly quoteAuthorized: false;
  readonly submissionAuthorized: false;
}

@Injectable()
export class AgenticWalletAuthenticationService {
  private state: AgenticWalletAuthenticationState = state('idle');
  private startInFlight: Promise<AgenticWalletAuthenticationState> | null =
    null;
  private verificationInFlight: Promise<void> | null = null;

  constructor(private readonly wallet: AgenticWalletAuthenticationAdapter) {}

  getState(): AgenticWalletAuthenticationState {
    return snapshot(this.state);
  }

  start(): Promise<AgenticWalletAuthenticationState> {
    if (this.startInFlight) return this.startInFlight;
    if (
      this.verificationInFlight &&
      this.state.status === 'awaiting_confirmation'
    ) {
      return Promise.resolve(this.getState());
    }

    const operation = this.begin();
    this.startInFlight = operation;
    const clear = (): void => {
      if (this.startInFlight === operation) this.startInFlight = null;
    };
    void operation.then(clear, clear);
    return operation;
  }

  private async begin(): Promise<AgenticWalletAuthenticationState> {
    const startedAt = new Date();
    const result = await this.wallet.start(startedAt);
    if (result.status === 'already_connected') {
      this.state = state('already_connected', {
        startedAt,
        completedAt: new Date(),
      });
      return this.getState();
    }

    this.state = state('awaiting_confirmation', {
      pairingCode: result.pairingCode,
      urlForWeb: result.urlForWeb,
      expiresAt: result.expiresAt,
      startedAt,
    });
    this.keepVerificationAlive(result);
    return this.getState();
  }

  private keepVerificationAlive(
    challenge: AgenticWalletAuthenticationChallenge,
  ): void {
    const operation = this.wallet
      .verify(challenge.qrCodeId)
      .then(() => {
        if (this.verificationInFlight === operation) {
          this.state = state('connected', {
            startedAt: this.state.startedAt,
            completedAt: new Date(),
          });
        }
      })
      .catch(() => {
        if (this.verificationInFlight === operation) {
          this.state = state('failed', {
            startedAt: this.state.startedAt,
            completedAt: new Date(),
          });
        }
      })
      .finally(() => {
        if (this.verificationInFlight === operation) {
          this.verificationInFlight = null;
        }
      });
    this.verificationInFlight = operation;
  }
}

function state(
  status: AgenticWalletAuthenticationState['status'],
  values: Partial<AgenticWalletAuthenticationState> = {},
): AgenticWalletAuthenticationState {
  return {
    scope: 'agentic_wallet_authentication',
    status,
    pairingCode: null,
    urlForWeb: null,
    expiresAt: null,
    startedAt: null,
    completedAt: null,
    quoteAuthorized: false,
    submissionAuthorized: false,
    ...values,
  };
}

function snapshot(
  value: AgenticWalletAuthenticationState,
): AgenticWalletAuthenticationState {
  return {
    ...value,
    expiresAt: value.expiresAt ? new Date(value.expiresAt) : null,
    startedAt: value.startedAt ? new Date(value.startedAt) : null,
    completedAt: value.completedAt ? new Date(value.completedAt) : null,
  };
}
