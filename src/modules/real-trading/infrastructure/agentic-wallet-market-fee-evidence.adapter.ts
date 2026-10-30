import Decimal from 'decimal.js';
import {
  RealExecutionIntent,
  validateRealExecutionIntent,
} from '../domain/real-execution';
import { APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT as instrument } from '../application/real-execution-instrument-approval';
import { AgenticWalletCliTextProcess } from './agentic-wallet-cli-text-process';
import { AgenticWalletCliJsonProcess } from './agentic-wallet-cli-json-process';
import {
  buildAgenticWalletCliVersionCheckArguments,
  validateAgenticWalletCliVersion,
} from './agentic-wallet-cli-version';

const ExactDecimal = Decimal.clone({
  precision: 80,
  toExpNeg: -80,
  toExpPos: 80,
});
const DECIMAL = /^(?:0|[1-9]\d{0,29})(?:\.\d{1,30})?$/;

export interface AgenticWalletMarketFeeEvidence {
  readonly intentId: string;
  readonly chainId: '56';
  readonly sourceSymbol: 'USDT' | 'BTCB';
  readonly targetSymbol: 'USDT' | 'BTCB';
  readonly sourceQuantity: string;
  readonly expectedTargetQuantity: string;
  readonly maximumSlippageRate: string;
  readonly providerFeeRate: string;
  readonly providerFeeUsd: string;
  readonly estimatedNetworkFeeUsd: string;
  readonly gasMode: string;
  readonly observedAt: Date;
  readonly coverage: 'provider_display_estimate';
}

export class AgenticWalletMarketFeeEvidenceAdapter {
  constructor(
    private readonly text: Pick<
      AgenticWalletCliTextProcess,
      'run'
    > = new AgenticWalletCliTextProcess('fee quote'),
    private readonly json: Pick<
      AgenticWalletCliJsonProcess,
      'run'
    > = new AgenticWalletCliJsonProcess('quote'),
    private readonly now: () => Date = () => new Date(),
  ) {}

  async load(
    input: RealExecutionIntent,
    signal?: AbortSignal,
  ): Promise<AgenticWalletMarketFeeEvidence> {
    validateRealExecutionIntent(input);
    const intent = {
      ...input,
      sourceAsset: { ...input.sourceAsset },
      targetAsset: { ...input.targetAsset },
    };
    const buy =
      intent.sourceAsset.tokenAddress.toLowerCase() ===
        instrument.usdt.tokenAddress &&
      intent.targetAsset.tokenAddress.toLowerCase() ===
        instrument.btc.tokenAddress;
    const sell =
      intent.sourceAsset.tokenAddress.toLowerCase() ===
        instrument.btc.tokenAddress &&
      intent.targetAsset.tokenAddress.toLowerCase() ===
        instrument.usdt.tokenAddress;
    if (
      intent.chainId !== '56' ||
      (!buy && !sell) ||
      new ExactDecimal(intent.maxSlippageRate).greaterThanOrEqualTo(1)
    )
      throw new Error('Market fee intent is not approved');
    if (signal?.aborted) throw signal.reason;
    validateAgenticWalletCliVersion(
      await this.json.run(buildAgenticWalletCliVersionCheckArguments(), signal),
      'quote',
    );
    const slippagePercent = new ExactDecimal(intent.maxSlippageRate)
      .times(100)
      .toFixed();
    const output = await this.text.run(
      [
        'market-order',
        'quote',
        '--fromTokenQty',
        intent.sourceQuantity,
        '--fromToken',
        intent.sourceAsset.tokenAddress,
        '--toToken',
        intent.targetAsset.tokenAddress,
        '--binanceChainId',
        '56',
        '--slippage',
        slippagePercent,
      ],
      signal,
    );
    const evidence = parseMarketFeeDisplay(
      output,
      intent.id,
      buy ? 'USDT' : 'BTCB',
      buy ? 'BTCB' : 'USDT',
      this.now(),
    );
    if (
      !new ExactDecimal(evidence.sourceQuantity).equals(
        intent.sourceQuantity,
      ) ||
      !new ExactDecimal(evidence.maximumSlippageRate).equals(
        intent.maxSlippageRate,
      )
    )
      throw new Error('Market fee quote context diverged');
    return evidence;
  }
}

export function parseMarketFeeDisplay(
  output: string,
  intentId: string,
  sourceSymbol: 'USDT' | 'BTCB',
  targetSymbol: 'USDT' | 'BTCB',
  observedAt: Date,
): AgenticWalletMarketFeeEvidence {
  const lines = output.trim().split(/\r?\n/);
  if (
    lines.length !== 8 ||
    lines[0]?.trim() !== 'Swap Quote' ||
    !(observedAt instanceof Date) ||
    !Number.isFinite(observedAt.getTime())
  )
    throw new Error('Market fee quote display is invalid');
  const value = (index: number, pattern: RegExp): string => {
    const found = lines[index]?.match(pattern)?.[1];
    if (found === undefined)
      throw new Error('Market fee quote display is invalid');
    return found;
  };
  const number = (text: string, positive = false): string => {
    if (
      !DECIMAL.test(text) ||
      (positive && !new ExactDecimal(text).isPositive())
    )
      throw new Error('Market fee quote decimal is invalid');
    return new ExactDecimal(text).toFixed();
  };
  const sourceQuantity = number(
    value(1, new RegExp(`^From:\\s+(\\S+) ${sourceSymbol}$`)),
    true,
  );
  const expectedTargetQuantity = number(
    value(2, new RegExp(`^To:\\s+(\\S+) ${targetSymbol}$`)),
    true,
  );
  const maximumSlippageRate = new ExactDecimal(
    number(value(3, /^Slippage:\s+(\S+)%$/)),
  )
    .div(100)
    .toFixed();
  const providerFeeRate = new ExactDecimal(number(value(4, /^Fee:\s+(\S+)%$/)))
    .div(100)
    .toFixed();
  if (
    new ExactDecimal(maximumSlippageRate).greaterThanOrEqualTo(1) ||
    new ExactDecimal(providerFeeRate).greaterThan(1)
  )
    throw new Error('Market fee quote rate is invalid');
  return {
    intentId,
    chainId: '56',
    sourceSymbol,
    targetSymbol,
    sourceQuantity,
    expectedTargetQuantity,
    maximumSlippageRate,
    providerFeeRate,
    providerFeeUsd: number(value(5, /^Fee \(USD\):\s+\$(\S+)$/)),
    estimatedNetworkFeeUsd: number(value(6, /^Gas \(USD\):\s+\$(\S+)$/)),
    gasMode: value(7, /^Gas Mode:\s+([A-Za-z]{1,16})$/).toLowerCase(),
    observedAt: new Date(observedAt),
    coverage: 'provider_display_estimate',
  };
}
