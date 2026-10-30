export interface GasDiagnosticPlan {
  id: string;
  fingerprint: string;
  walletHash: string;
  expectedBtcb: string;
  minimumBtcb: string;
  slippageRate: string;
  nativeBnbAtRisk: string;
  referenceBnbUsdt: string;
  networkBudgetUsdt: string;
  maximumPotentialLossUsdt: string;
  createdAt: string;
  expiresAt: string;
}

export interface GasDiagnosticRecord {
  plan: GasDiagnosticPlan;
  state: 'prepared' | 'claimed' | 'submitted' | 'unknown';
  providerOrderId: string | null;
}

export abstract class GasDiagnosticStore {
  abstract prepare(plan: GasDiagnosticPlan): Promise<void>;
  abstract read(id: string): Promise<GasDiagnosticRecord | null>;
  abstract claim(id: string, fingerprint: string): Promise<void>;
  abstract recordOutcome(id: string, orderId: string | null): Promise<void>;
}

export class GasDiagnosticBlockedError extends Error {}
export class InvalidGasDiagnosticRequestError extends Error {}
