import {
  assessAutonomousDailyLoss,
  AutonomousDailyLossSnapshot,
} from './autonomous-daily-loss-policy';
const at = new Date('2026-10-30T12:00:00Z');
const snapshot = (): AutonomousDailyLossSnapshot => ({
  netPnlUsdt: '-9',
  outstandingPotentialLossUsdt: '0',
  heldBaseQuantity: '0.001',
  utcDay: '2026-10-30',
  observedAt: at,
  coverage: 'complete',
});
describe('autonomous daily loss policy', () => {
  it('allows an entry exactly at capacity without granting risk or submission authority', () => {
    expect(
      assessAutonomousDailyLoss(
        '10',
        true,
        snapshot(),
        { kind: 'entry', maximumPotentialLossUsdt: '1' },
        at,
      ),
    ).toMatchObject({
      status: 'within_loss_policy',
      projectedLossUsdt: '10',
      riskApproved: false,
      submissionAuthorized: false,
    });
  });
  it('includes outstanding and proposed potential losses with exact decimals', () => {
    expect(
      assessAutonomousDailyLoss(
        '10',
        true,
        { ...snapshot(), outstandingPotentialLossUsdt: '0.000000000000000001' },
        { kind: 'entry', maximumPotentialLossUsdt: '1' },
        at,
      ),
    ).toMatchObject({
      status: 'blocked',
      projectedLossUsdt: '10.000000000000000001',
    });
  });
  it('blocks new exposure at the loss threshold', () => {
    expect(
      assessAutonomousDailyLoss(
        '10',
        true,
        { ...snapshot(), netPnlUsdt: '-10' },
        { kind: 'entry', maximumPotentialLossUsdt: '0.1' },
        at,
      ).status,
    ).toBe('blocked');
  });
  it('does not expand loss capacity with prior profits', () => {
    expect(
      assessAutonomousDailyLoss(
        '10',
        true,
        { ...snapshot(), netPnlUsdt: '100' },
        { kind: 'entry', maximumPotentialLossUsdt: '11' },
        at,
      ).status,
    ).toBe('blocked');
  });
  it('permits an authorized protective reduction despite a breached loss threshold', () => {
    expect(
      assessAutonomousDailyLoss(
        '10',
        true,
        { ...snapshot(), netPnlUsdt: '-11' },
        { kind: 'protective_exit', sellBaseQuantity: '0.001' },
        at,
      ),
    ).toMatchObject({
      status: 'within_loss_policy',
      reason: 'protective_exit_reduces_position',
      submissionAuthorized: false,
    });
  });
  it.each(['0', '0.001000000000000001', '-1', 'NaN'])(
    'blocks invalid or excessive protective quantity %s',
    (quantity) => {
      expect(
        assessAutonomousDailyLoss(
          '10',
          true,
          snapshot(),
          { kind: 'protective_exit', sellBaseQuantity: quantity },
          at,
        ).status,
      ).toBe('blocked');
    },
  );
  it('requires explicit protective-exit permission', () => {
    expect(
      assessAutonomousDailyLoss(
        '10',
        false,
        snapshot(),
        { kind: 'protective_exit', sellBaseQuantity: '0.001' },
        at,
      ).status,
    ).toBe('blocked');
  });
  it.each([null, '0', '-10', 'NaN'])(
    'rejects invalid loss capacity %s',
    (limit) => {
      expect(
        assessAutonomousDailyLoss(
          limit,
          true,
          snapshot(),
          { kind: 'entry', maximumPotentialLossUsdt: '1' },
          at,
        ).status,
      ).toBe('blocked');
    },
  );
  it.each([-1, 5001, NaN])(
    'rejects future, stale or invalid snapshot age %s',
    (age) => {
      expect(
        assessAutonomousDailyLoss(
          '10',
          true,
          { ...snapshot(), observedAt: new Date(at.getTime() - age) },
          { kind: 'entry', maximumPotentialLossUsdt: '1' },
          at,
        ).status,
      ).toBe('blocked');
    },
  );
  it('requires complete accounting and the same UTC day', () => {
    expect(
      assessAutonomousDailyLoss(
        '10',
        true,
        { ...snapshot(), coverage: 'partial' },
        { kind: 'entry', maximumPotentialLossUsdt: '1' },
        at,
      ).status,
    ).toBe('blocked');
    expect(
      assessAutonomousDailyLoss(
        '10',
        true,
        { ...snapshot(), utcDay: '2026-10-29' },
        { kind: 'entry', maximumPotentialLossUsdt: '1' },
        at,
      ).status,
    ).toBe('blocked');
  });
});
