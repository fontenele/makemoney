import { createHash } from 'node:crypto';

import { ClaimedRealExecutionSubmissionCommand } from '../application/real-execution-submission-attempt.store';
import { APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT } from '../application/real-execution-instrument-approval';
import { validateClaimedMarketSwapCommand } from './agentic-wallet-market-swap-command-runner';

describe('Agentic Wallet claimed market-swap command runner', () => {
  it('accepts only the complete claimed BTCB/USDT invocation', () => {
    expect(validateClaimedMarketSwapCommand(command())).toEqual(
      command().arguments,
    );
  });

  it.each([
    { kind: 'preview' },
    { attemptId: 'invalid' },
    { automaticRetryAllowed: true },
    { arguments: [...command().arguments.slice(0, -1)] },
    {
      arguments: command().arguments.map((value, index) =>
        index === 9 ? '1' : value,
      ),
    },
    {
      arguments: command().arguments.map((value, index) =>
        index === 13 ? 'false' : value,
      ),
    },
  ])('rejects altered claim envelope %#', (change) => {
    expect(() =>
      validateClaimedMarketSwapCommand({
        ...command(),
        ...change,
      } as ClaimedRealExecutionSubmissionCommand),
    ).toThrow();
  });
});

function command(): ClaimedRealExecutionSubmissionCommand {
  const approved = APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT;
  const arguments_ = [
    'market-order',
    'swap',
    '--fromTokenQty',
    '10',
    '--fromToken',
    approved.usdt.tokenAddress,
    '--toToken',
    approved.btc.tokenAddress,
    '--binanceChainId',
    '56',
    '--slippage',
    '0.5',
    '--mev',
    'true',
    '--gasLevel',
    'MEDIUM',
    '--json',
  ];
  return {
    kind: 'agentic_wallet_claimed_market_swap',
    attemptId: '00000000-0000-4000-8000-000000000151',
    gateId: '00000000-0000-4000-8000-000000000034',
    arguments: arguments_,
    commandArgumentsFingerprint: createHash('sha256')
      .update(JSON.stringify(arguments_))
      .digest('hex'),
    automaticRetryAllowed: false,
  };
}
