import {
  RealExecutionCapabilitySnapshot,
  RealExecutionIntent,
} from '../domain/real-execution';
import {
  evaluateRealExecutionPreflight,
  RealExecutionPreflightConfiguration,
} from './real-execution-preflight';

describe('real execution preflight', () => {
  it('reports capability readiness without authorizing a quote or submission', () => {
    expect(
      evaluateRealExecutionPreflight(
        enabledConfiguration(),
        intent(),
        capabilities(),
        new Date('2026-09-30T12:00:05.000Z'),
      ),
    ).toEqual({
      scope: 'capability_preflight',
      status: 'ready',
      blockers: [],
      quoteAuthorized: false,
      submissionAuthorized: false,
      evaluatedAt: new Date('2026-09-30T12:00:05.000Z'),
    });
  });

  it('requires both independent activation gates', () => {
    const disabled = evaluateRealExecutionPreflight(
      {
        ...enabledConfiguration(),
        tradingMode: 'paper',
        realExecutionEnabled: false,
      },
      intent(),
      capabilities(),
      new Date('2026-09-30T12:00:05.000Z'),
    );

    expect(disabled.status).toBe('blocked');
    expect(disabled.blockers).toEqual(
      expect.arrayContaining([
        'trading_mode_not_real',
        'real_execution_disabled',
      ]),
    );
  });

  it('requires exact provider, chain, and token approvals', () => {
    const assessment = evaluateRealExecutionPreflight(
      {
        ...enabledConfiguration(),
        approvedProviderId: 'another_provider',
        approvedChainId: '8453',
        approvedSourceTokenAddress: '0xanother-source',
        approvedTargetTokenAddress: '0xanother-target',
      },
      intent(),
      capabilities(),
      new Date('2026-09-30T12:00:05.000Z'),
    );

    expect(assessment.blockers).toEqual(
      expect.arrayContaining([
        'capability_provider_mismatch',
        'chain_unavailable',
        'chain_not_approved',
        'source_token_not_approved',
        'target_token_not_approved',
      ]),
    );
  });

  it('rejects disconnected, future, stale, and incomplete capability facts', () => {
    const incomplete = capabilities();
    const assessment = evaluateRealExecutionPreflight(
      enabledConfiguration(),
      intent(),
      {
        ...incomplete,
        connected: false,
        chains: [{ chainId: '56', operations: [] }],
        reads: {
          securitySettings: false,
          quota: false,
          balances: false,
          gas: false,
        },
        observedAt: new Date('2026-09-30T11:59:49.999Z'),
      },
      new Date('2026-09-30T12:00:00.000Z'),
    );

    expect(assessment.blockers).toEqual(
      expect.arrayContaining([
        'wallet_disconnected',
        'capability_snapshot_stale',
        'quote_capability_unavailable',
        'security_settings_read_unavailable',
        'quota_read_unavailable',
        'balances_read_unavailable',
        'gas_read_unavailable',
      ]),
    );

    expect(
      evaluateRealExecutionPreflight(
        enabledConfiguration(),
        intent(),
        {
          ...capabilities(),
          observedAt: new Date('2026-09-30T12:00:00.001Z'),
        },
        new Date('2026-09-30T12:00:00.000Z'),
      ).blockers,
    ).toContain('capability_snapshot_from_future');
  });

  it('fails closed for malformed intent and capability facts', () => {
    const assessment = evaluateRealExecutionPreflight(
      enabledConfiguration(),
      { ...intent(), sourceQuantity: '0' },
      {
        ...capabilities(),
        chains: [capabilities().chains[0], capabilities().chains[0]],
      },
      new Date('2026-09-30T12:00:05.000Z'),
    );

    expect(assessment.blockers).toEqual(
      expect.arrayContaining(['invalid_intent', 'invalid_capability_snapshot']),
    );
    expect(assessment.status).toBe('blocked');
  });
});

function enabledConfiguration(): RealExecutionPreflightConfiguration {
  return {
    tradingMode: 'real',
    realExecutionEnabled: true,
    approvedProviderId: 'agentic_wallet',
    approvedChainId: '56',
    approvedSourceTokenAddress: '0xsource',
    approvedTargetTokenAddress: '0xtarget',
    capabilityMaxAgeMs: 10000,
  };
}

function intent(): RealExecutionIntent {
  return {
    id: '0199a123-4567-7abc-8def-0123456789ab',
    idempotencyKey: 'intent:0199a123-4567-7abc-8def-0123456789ab',
    kind: 'market_swap',
    chainId: '56',
    sourceAsset: { tokenAddress: '0xsource', symbol: 'USDT' },
    targetAsset: { tokenAddress: '0xtarget', symbol: 'BTCB' },
    sourceQuantity: '10',
    maxSlippageRate: '0.005',
    createdAt: new Date('2026-09-30T12:00:00.000Z'),
  };
}

function capabilities(): RealExecutionCapabilitySnapshot {
  return {
    providerId: 'agentic_wallet',
    connected: true,
    chains: [{ chainId: '56', operations: ['market_swap_quote'] }],
    reads: {
      securitySettings: true,
      quota: true,
      balances: true,
      gas: true,
    },
    observedAt: new Date('2026-09-30T12:00:00.000Z'),
  };
}
