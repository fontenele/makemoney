import {
  RealExecutionCapabilitySnapshot,
  RealExecutionIntent,
  validateRealExecutionCapabilitySnapshot,
  validateRealExecutionIntent,
} from '../domain/real-execution';

export interface RealExecutionPreflightConfiguration {
  readonly tradingMode: 'paper' | 'real';
  readonly realExecutionEnabled: boolean;
  readonly approvedProviderId: string | null;
  readonly approvedChainId: string | null;
  readonly approvedSourceTokenAddress: string | null;
  readonly approvedTargetTokenAddress: string | null;
  readonly capabilityMaxAgeMs: number;
}

export type RealExecutionPreflightBlocker =
  | 'invalid_intent'
  | 'invalid_capability_snapshot'
  | 'trading_mode_not_real'
  | 'real_execution_disabled'
  | 'provider_not_approved'
  | 'chain_not_approved'
  | 'source_token_not_approved'
  | 'target_token_not_approved'
  | 'capability_provider_mismatch'
  | 'wallet_disconnected'
  | 'capability_snapshot_from_future'
  | 'capability_snapshot_stale'
  | 'chain_unavailable'
  | 'quote_capability_unavailable'
  | 'security_settings_read_unavailable'
  | 'quota_read_unavailable'
  | 'balances_read_unavailable'
  | 'gas_read_unavailable';

export interface RealExecutionPreflightAssessment {
  readonly scope: 'capability_preflight';
  readonly status: 'ready' | 'blocked';
  readonly blockers: readonly RealExecutionPreflightBlocker[];
  readonly quoteAuthorized: false;
  readonly submissionAuthorized: false;
  readonly evaluatedAt: Date;
}

export function evaluateRealExecutionPreflight(
  configuration: RealExecutionPreflightConfiguration,
  intent: RealExecutionIntent,
  capabilities: RealExecutionCapabilitySnapshot,
  evaluatedAt: Date,
): RealExecutionPreflightAssessment {
  validateEvaluationInputs(configuration, evaluatedAt);
  const blockers: RealExecutionPreflightBlocker[] = [];

  try {
    validateRealExecutionIntent(intent);
  } catch {
    blockers.push('invalid_intent');
  }
  try {
    validateRealExecutionCapabilitySnapshot(capabilities);
  } catch {
    blockers.push('invalid_capability_snapshot');
  }

  addIf(
    blockers,
    configuration.tradingMode !== 'real',
    'trading_mode_not_real',
  );
  addIf(
    blockers,
    !configuration.realExecutionEnabled,
    'real_execution_disabled',
  );
  addIf(
    blockers,
    configuration.approvedProviderId === null,
    'provider_not_approved',
  );
  addIf(blockers, configuration.approvedChainId === null, 'chain_not_approved');
  addIf(
    blockers,
    configuration.approvedSourceTokenAddress === null,
    'source_token_not_approved',
  );
  addIf(
    blockers,
    configuration.approvedTargetTokenAddress === null,
    'target_token_not_approved',
  );
  addIf(
    blockers,
    configuration.approvedProviderId !== null &&
      capabilities.providerId !== configuration.approvedProviderId,
    'capability_provider_mismatch',
  );
  addIf(blockers, !capabilities.connected, 'wallet_disconnected');

  const snapshotAgeMs =
    evaluatedAt.getTime() - capabilities.observedAt.getTime();
  addIf(blockers, snapshotAgeMs < 0, 'capability_snapshot_from_future');
  addIf(
    blockers,
    snapshotAgeMs > configuration.capabilityMaxAgeMs,
    'capability_snapshot_stale',
  );

  const approvedChain = capabilities.chains.find(
    (chain) => chain.chainId === configuration.approvedChainId,
  );
  addIf(blockers, approvedChain === undefined, 'chain_unavailable');
  addIf(
    blockers,
    approvedChain !== undefined &&
      !approvedChain.operations.includes('market_swap_quote'),
    'quote_capability_unavailable',
  );

  if (!blockers.includes('invalid_intent')) {
    addIf(
      blockers,
      intent.chainId !== configuration.approvedChainId,
      'chain_not_approved',
    );
    addIf(
      blockers,
      intent.sourceAsset.tokenAddress !==
        configuration.approvedSourceTokenAddress,
      'source_token_not_approved',
    );
    addIf(
      blockers,
      intent.targetAsset.tokenAddress !==
        configuration.approvedTargetTokenAddress,
      'target_token_not_approved',
    );
  }

  addIf(
    blockers,
    !capabilities.reads.securitySettings,
    'security_settings_read_unavailable',
  );
  addIf(blockers, !capabilities.reads.quota, 'quota_read_unavailable');
  addIf(blockers, !capabilities.reads.balances, 'balances_read_unavailable');
  addIf(blockers, !capabilities.reads.gas, 'gas_read_unavailable');

  return {
    scope: 'capability_preflight',
    status: blockers.length === 0 ? 'ready' : 'blocked',
    blockers,
    quoteAuthorized: false,
    submissionAuthorized: false,
    evaluatedAt: new Date(evaluatedAt),
  };
}

function validateEvaluationInputs(
  configuration: RealExecutionPreflightConfiguration,
  evaluatedAt: Date,
): void {
  if (
    !Number.isInteger(configuration.capabilityMaxAgeMs) ||
    configuration.capabilityMaxAgeMs <= 0
  ) {
    throw new Error('Real execution capability maximum age must be positive');
  }
  if (
    !(evaluatedAt instanceof Date) ||
    !Number.isFinite(evaluatedAt.getTime())
  ) {
    throw new Error('Real execution preflight evaluation time must be valid');
  }
}

function addIf(
  blockers: RealExecutionPreflightBlocker[],
  condition: boolean,
  blocker: RealExecutionPreflightBlocker,
): void {
  if (condition && !blockers.includes(blocker)) {
    blockers.push(blocker);
  }
}
