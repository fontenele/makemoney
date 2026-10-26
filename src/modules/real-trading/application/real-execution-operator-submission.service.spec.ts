import { jest } from '@jest/globals';
import { ConfigService } from '@nestjs/config';

import { APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT } from './real-execution-instrument-approval';
import {
  InvalidRealExecutionOperatorSubmissionRequestError,
  REAL_EXECUTION_OPERATOR_ACKNOWLEDGMENT,
  RealExecutionOperatorEnvironment,
  RealExecutionOperatorSubmissionBlockedError,
  RealExecutionOperatorSubmissionService,
} from './real-execution-operator-submission.service';
import { RealExecutionSubmissionService } from './real-execution-submission.service';

const ATTEMPT_ID = '00000000-0000-4000-8000-000000000152';
const GATE_ID = '00000000-0000-4000-8000-000000000034';

describe('RealExecutionOperatorSubmissionService', () => {
  it('delegates one exact immediately acknowledged request when every runtime gate is active', async () => {
    const harness = createHarness(readyEnvironment());

    await expect(harness.service.submit(request())).resolves.toEqual({
      accepted: true,
    });
    expect(harness.submit).toHaveBeenCalledWith(
      { attemptId: ATTEMPT_ID, gateId: GATE_ID },
      undefined,
    );
  });

  it('validates the exact request before reading configuration or delegating', () => {
    const harness = createHarness(readyEnvironment());

    expect(() =>
      harness.service.submit({ ...request(), acknowledgment: 'yes' }),
    ).toThrow(InvalidRealExecutionOperatorSubmissionRequestError);
    expect(harness.get).not.toHaveBeenCalled();
    expect(harness.submit).not.toHaveBeenCalled();
  });

  it('reports every independent disabled runtime safeguard before claim access', () => {
    const harness = createHarness({
      ...readyEnvironment(),
      TRADING_MODE: 'paper',
      REAL_EXECUTION_ENABLED: false,
      REAL_EXECUTION_OPERATOR_SUBMISSION_ENABLED: false,
      REAL_EXECUTION_APPROVED_PROVIDER_ID: null,
      REAL_EXECUTION_APPROVED_CHAIN_ID: null,
      REAL_EXECUTION_APPROVED_SOURCE_TOKEN_ADDRESS: null,
      REAL_EXECUTION_APPROVED_TARGET_TOKEN_ADDRESS: null,
    });

    expect(() => harness.service.submit(request())).toThrow(
      RealExecutionOperatorSubmissionBlockedError,
    );
    expect(() => harness.service.submit(request())).toThrow(
      'real_trading_mode_disabled, real_execution_disabled, operator_submission_disabled, provider_not_approved, chain_not_approved, instrument_not_approved',
    );
    expect(harness.submit).not.toHaveBeenCalled();
  });

  it('rejects a different token pair even with all activation booleans enabled', () => {
    const harness = createHarness({
      ...readyEnvironment(),
      REAL_EXECUTION_APPROVED_TARGET_TOKEN_ADDRESS: '0xother',
    });
    expect(() => harness.service.submit(request())).toThrow(
      'instrument_not_approved',
    );
    expect(harness.submit).not.toHaveBeenCalled();
  });
});

function createHarness(environment: RealExecutionOperatorEnvironment) {
  const get = jest.fn(
    (key: keyof RealExecutionOperatorEnvironment) => environment[key],
  );
  const config = { get } as unknown as ConfigService<
    RealExecutionOperatorEnvironment,
    true
  >;
  const submit = jest
    .fn<RealExecutionSubmissionService['submit']>()
    .mockResolvedValue({ accepted: true } as never);
  const submissions = { submit } as unknown as RealExecutionSubmissionService;
  return {
    get,
    submit,
    service: new RealExecutionOperatorSubmissionService(config, submissions),
  };
}

function readyEnvironment(): RealExecutionOperatorEnvironment {
  const approved = APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT;
  return {
    TRADING_MODE: 'real',
    REAL_EXECUTION_ENABLED: true,
    REAL_EXECUTION_OPERATOR_SUBMISSION_ENABLED: true,
    REAL_EXECUTION_APPROVED_PROVIDER_ID: approved.providerId,
    REAL_EXECUTION_APPROVED_CHAIN_ID: approved.chainId,
    REAL_EXECUTION_APPROVED_SOURCE_TOKEN_ADDRESS: approved.usdt.tokenAddress,
    REAL_EXECUTION_APPROVED_TARGET_TOKEN_ADDRESS: approved.btc.tokenAddress,
  };
}

function request() {
  return {
    attemptId: ATTEMPT_ID,
    gateId: GATE_ID,
    acknowledgment: REAL_EXECUTION_OPERATOR_ACKNOWLEDGMENT,
  };
}
