import Decimal from 'decimal.js';

import {
  AgenticWalletFundingConversionTransactionReceiptReader,
  FundingConversionTransactionReceipt,
} from '../application/agentic-wallet-funding-conversion-transaction-receipt.reader';
import { AgenticWalletCliJsonProcess } from './agentic-wallet-cli-json-process';
import {
  buildAgenticWalletCliVersionCheckArguments,
  validateAgenticWalletCliVersion,
} from './agentic-wallet-cli-version';
import {
  BSC_NATIVE_BNB_ADDRESS,
  BSC_USDT_ADDRESS,
} from './agentic-wallet-funding-conversion-quote.adapter';
import { isCanonicalFundingConversionTransactionHash } from './agentic-wallet-funding-conversion-status-response';

const ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/;
const RAW_UNITS_PATTERN = /^(?:0|[1-9]\d*)$/;
const ExactDecimal = Decimal.clone({
  precision: 80,
  toExpNeg: -80,
  toExpPos: 80,
});

export class AgenticWalletFundingConversionTransactionReceiptAdapter extends AgenticWalletFundingConversionTransactionReceiptReader {
  constructor(
    private readonly process = new AgenticWalletCliJsonProcess(
      'funding conversion receipt',
    ),
    private readonly now: () => Date = () => new Date(),
  ) {
    super();
  }

  async load(
    transactionHash: string,
    signal?: AbortSignal,
  ): Promise<FundingConversionTransactionReceipt> {
    if (!isCanonicalFundingConversionTransactionHash(transactionHash))
      throw new Error('Funding conversion transaction hash is invalid');
    validateAgenticWalletCliVersion(
      await this.process.run(
        buildAgenticWalletCliVersionCheckArguments(),
        signal,
      ),
      'funding conversion receipt',
    );
    const response = await this.process.run(
      [
        'wallet',
        'tx-history',
        '--tx',
        transactionHash,
        '--binanceChainId',
        '56',
        '--json',
      ],
      signal,
    );
    return parseReceipt(response, transactionHash, this.now());
  }
}

export function parseFundingConversionTransactionReceipt(
  response: unknown,
  transactionHash: string,
  observedAt: Date,
): FundingConversionTransactionReceipt {
  return parseReceipt(response, transactionHash, observedAt);
}

function parseReceipt(
  response: unknown,
  expectedHash: string,
  observedAt: Date,
): FundingConversionTransactionReceipt {
  if (!isCanonicalFundingConversionTransactionHash(expectedHash))
    throw new Error('Funding conversion transaction hash is invalid');
  const envelope = record(response);
  const data = envelope.success === true ? record(envelope.data) : null;
  const transactions = data?.transactions;
  if (!Array.isArray(transactions) || transactions.length !== 1)
    throw invalid();
  const transaction = record(transactions[0]);
  const hashes = transaction.txHashList;
  if (
    transaction.txType !== 'swap' ||
    lowerHash(transaction.txHash) !== expectedHash ||
    transaction.binanceChainId !== '56' ||
    transaction.status !== 'confirmed' ||
    !Array.isArray(hashes) ||
    hashes.length !== 1
  )
    throw invalid();
  const transactionTime = date(transaction.txTime);
  const hash = record(hashes[0]);
  if (
    hash.binanceChainId !== '56' ||
    lowerHash(hash.txHash) !== expectedHash ||
    hash.status !== 'confirmed'
  )
    throw invalid();

  const networkFee = record(hash.networkFee);
  if (
    networkFee.binanceChainId !== '56' ||
    lowerAddress(networkFee.feeTokenAddress) !==
      BSC_NATIVE_BNB_ADDRESS.toLowerCase() ||
    networkFee.feeTokenSymbol !== 'BNB' ||
    networkFee.feeTokenDecimals !== 18
  )
    throw invalid();
  const networkFeeQuantityBnb = positiveUnits(networkFee.feeValue);

  const instructions = record(hash.instructions);
  const send = onlyInstruction(instructions.send);
  const receive = onlyInstruction(instructions.receive);
  const sent = tokenMovement(send, 'BNB', BSC_NATIVE_BNB_ADDRESS);
  const received = tokenMovement(receive, 'USDT', BSC_USDT_ADDRESS);
  if (sent.walletAddress !== received.walletAddress) throw invalid();
  if (
    !(observedAt instanceof Date) ||
    !Number.isFinite(observedAt.getTime()) ||
    observedAt.getTime() < transactionTime.getTime()
  )
    throw invalid();
  return {
    scope: 'agentic_wallet_funding_conversion_transaction_receipt',
    transactionHash: expectedHash,
    chainId: '56',
    walletAddress: sent.walletAddress,
    sourceTokenAddress: BSC_NATIVE_BNB_ADDRESS.toLowerCase(),
    targetTokenAddress: BSC_USDT_ADDRESS.toLowerCase(),
    sourceQuantityBnb: sent.quantity,
    actualUsdtReceived: received.quantity,
    networkFeeQuantityBnb,
    transactionTime,
    observedAt: new Date(observedAt),
  };
}

function tokenMovement(
  value: Record<string, unknown>,
  symbol: 'BNB' | 'USDT',
  address: string,
): { walletAddress: string; quantity: string } {
  const addressInfo = record(value.addressInfo);
  const tokenInfo = record(value.tokenInfo);
  const walletAddress = lowerAddress(addressInfo.address);
  if (
    value.binanceChainId !== '56' ||
    walletAddress === null ||
    tokenInfo.binanceChainId !== '56' ||
    lowerAddress(tokenInfo.contractAddress) !== address.toLowerCase() ||
    tokenInfo.symbol !== symbol ||
    tokenInfo.tokenId !== null ||
    tokenInfo.decimals !== 18
  )
    throw invalid();
  return { walletAddress, quantity: positiveUnits(value.amount) };
}

function onlyInstruction(value: unknown): Record<string, unknown> {
  if (!Array.isArray(value) || value.length !== 1) throw invalid();
  return record(value[0]);
}

function positiveUnits(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !RAW_UNITS_PATTERN.test(value) ||
    value === '0'
  )
    throw invalid();
  return new ExactDecimal(value).div('1000000000000000000').toFixed();
}

function date(value: unknown): Date {
  if (typeof value !== 'string') throw invalid();
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) throw invalid();
  return parsed;
}

function lowerHash(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const lowered = value.toLowerCase();
  return isCanonicalFundingConversionTransactionHash(lowered) ? lowered : null;
}

function lowerAddress(value: unknown): string | null {
  return typeof value === 'string' && ADDRESS_PATTERN.test(value)
    ? value.toLowerCase()
    : null;
}

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    throw invalid();
  return value as Record<string, unknown>;
}

function invalid(): Error {
  return new Error('Funding conversion transaction receipt is invalid');
}
