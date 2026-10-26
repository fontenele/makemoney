import { createHash } from 'node:crypto';

import { ClaimedRealExecutionSubmissionCommand } from '../application/real-execution-submission-attempt.store';
import { APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT } from '../application/real-execution-instrument-approval';
import { AgenticWalletCliJsonProcess } from './agentic-wallet-cli-json-process';
import {
  buildAgenticWalletCliVersionCheckArguments,
  validateAgenticWalletCliVersion,
} from './agentic-wallet-cli-version';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const POSITIVE_DECIMAL_PATTERN = /^(?:[1-9]\d*(?:\.\d*[1-9])?|0\.\d*[1-9])$/;
const PERCENT_PATTERN = /^(?:0(?:\.\d*[1-9])?|[1-9]\d?(?:\.\d*[1-9])?|100)$/;

export interface AgenticWalletMarketSwapCommandRunner {
  run(
    command: ClaimedRealExecutionSubmissionCommand,
    signal?: AbortSignal,
  ): Promise<unknown>;
}

export class AgenticWalletMarketSwapCliProcessRunner implements AgenticWalletMarketSwapCommandRunner {
  private readonly process: AgenticWalletCliJsonProcess;

  constructor(timeoutMs = 30000, executable?: string) {
    this.process = new AgenticWalletCliJsonProcess(
      'real execution swap',
      timeoutMs,
      executable,
    );
  }

  async run(
    command: ClaimedRealExecutionSubmissionCommand,
    signal?: AbortSignal,
  ): Promise<unknown> {
    const arguments_ = validateClaimedMarketSwapCommand(command);
    validateAgenticWalletCliVersion(
      await this.process.run(
        buildAgenticWalletCliVersionCheckArguments(),
        signal,
      ),
      'real execution swap',
    );
    return this.process.run(arguments_, signal);
  }
}

export function validateClaimedMarketSwapCommand(
  command: ClaimedRealExecutionSubmissionCommand,
): readonly string[] {
  const args = asStringArray(command?.arguments);
  const approved = APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT;
  if (
    command?.kind !== 'agentic_wallet_claimed_market_swap' ||
    !UUID_PATTERN.test(command.attemptId) ||
    !UUID_PATTERN.test(command.gateId) ||
    !/^[a-f0-9]{64}$/.test(command.commandArgumentsFingerprint) ||
    command.automaticRetryAllowed !== false ||
    args === null ||
    args.length !== 17 ||
    args[0] !== 'market-order' ||
    args[1] !== 'swap' ||
    args[2] !== '--fromTokenQty' ||
    !POSITIVE_DECIMAL_PATTERN.test(args[3] ?? '') ||
    args[4] !== '--fromToken' ||
    args[6] !== '--toToken' ||
    args[8] !== '--binanceChainId' ||
    args[9] !== approved.chainId ||
    args[10] !== '--slippage' ||
    !PERCENT_PATTERN.test(args[11] ?? '') ||
    args[12] !== '--mev' ||
    args[13] !== 'true' ||
    args[14] !== '--gasLevel' ||
    args[15] !== 'MEDIUM' ||
    args[16] !== '--json'
  ) {
    throw new Error('Claimed Agentic Wallet market-swap command is invalid');
  }
  const source = args[5];
  const target = args[7];
  const directionApproved =
    (source === approved.usdt.tokenAddress &&
      target === approved.btc.tokenAddress) ||
    (source === approved.btc.tokenAddress &&
      target === approved.usdt.tokenAddress);
  if (!directionApproved) {
    throw new Error(
      'Claimed Agentic Wallet market-swap command is outside the approved instrument',
    );
  }
  if (
    createHash('sha256').update(JSON.stringify(args)).digest('hex') !==
    command.commandArgumentsFingerprint
  ) {
    throw new Error(
      'Claimed Agentic Wallet market-swap command fingerprint does not match',
    );
  }
  return [...args];
}

function asStringArray(value: unknown): readonly string[] | null {
  if (!Array.isArray(value)) return null;
  const entries = value as unknown[];
  return entries.every((entry) => typeof entry === 'string') ? entries : null;
}
