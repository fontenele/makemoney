import Decimal from 'decimal.js';

import {
  AgenticWalletFundingConversionTransactionReceiptReader,
  FundingConversionTransactionReceipt,
} from '../application/agentic-wallet-funding-conversion-transaction-receipt.reader';
import {
  BSC_NATIVE_BNB_ADDRESS,
  BSC_USDT_ADDRESS,
} from './agentic-wallet-funding-conversion-quote.adapter';
import { isCanonicalFundingConversionTransactionHash } from './agentic-wallet-funding-conversion-status-response';

const BSC_RPC_URL = 'https://bsc-dataseed.bnbchain.org';
const BSC_CHAIN_ID = '0x38';
const TIMEOUT_MS = 10_000;
const ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/;
const BLOCK_QUANTITY_PATTERN = /^0x(?:0|[1-9a-f][0-9a-f]*)$/i;
const DATA_QUANTITY_PATTERN = /^0x[0-9a-f]+$/i;
const TRANSFER_TOPIC =
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
const ExactDecimal = Decimal.clone({
  precision: 80,
  toExpNeg: -80,
  toExpPos: 80,
});
type HttpClient = (input: string, init?: RequestInit) => Promise<Response>;

export class AgenticWalletFundingConversionTransactionReceiptAdapter extends AgenticWalletFundingConversionTransactionReceiptReader {
  constructor(
    private readonly http: HttpClient = fetch,
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
    const response = await this.post(
      [
        {
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_getTransactionByHash',
          params: [transactionHash],
        },
        {
          jsonrpc: '2.0',
          id: 2,
          method: 'eth_getTransactionReceipt',
          params: [transactionHash],
        },
        {
          jsonrpc: '2.0',
          id: 3,
          method: 'eth_getBlockByNumber',
          params: ['finalized', false],
        },
      ],
      signal,
    );
    const receiptBlockHash = referencedReceiptBlockHash(
      response,
      transactionHash,
    );
    const blockResponse = await this.post(
      {
        jsonrpc: '2.0',
        id: 4,
        method: 'eth_getBlockByHash',
        params: [receiptBlockHash, false],
      },
      signal,
    );
    return parseOnChainReceipt(
      response,
      blockResponse,
      transactionHash,
      this.now(),
    );
  }

  private async post(body: object, signal?: AbortSignal): Promise<unknown> {
    const timeout = AbortSignal.timeout(TIMEOUT_MS);
    const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
    const response = await this.http(BSC_RPC_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: combined,
    });
    if (!response.ok)
      throw new Error('Funding conversion transaction receipt request failed');
    return response.json() as Promise<unknown>;
  }
}

export function parseFundingConversionTransactionReceipt(
  response: unknown,
  blockResponse: unknown,
  transactionHash: string,
  observedAt: Date,
): FundingConversionTransactionReceipt {
  return parseOnChainReceipt(
    response,
    blockResponse,
    transactionHash,
    observedAt,
  );
}

function parseOnChainReceipt(
  response: unknown,
  blockResponse: unknown,
  expectedHash: string,
  observedAt: Date,
): FundingConversionTransactionReceipt {
  if (!isCanonicalFundingConversionTransactionHash(expectedHash))
    throw invalid();
  const results = rpcResults(response);
  const transaction = results.get(1);
  const receipt = results.get(2);
  const finalizedBlock = results.get(3);
  const receiptBlock = rpcResult(blockResponse, 4);
  if (
    transaction === undefined ||
    receipt === undefined ||
    finalizedBlock === undefined
  )
    throw invalid();

  const transactionHash = lowerHash(transaction.hash);
  const receiptHash = lowerHash(receipt.transactionHash);
  const walletAddress = lowerAddress(transaction.from);
  const receiptWalletAddress = lowerAddress(receipt.from);
  const transactionTo = lowerAddress(transaction.to);
  const receiptTo = lowerAddress(receipt.to);
  const transactionBlockNumber = blockQuantity(transaction.blockNumber);
  const receiptBlockNumber = blockQuantity(receipt.blockNumber);
  const transactionBlockHash = lowerHash(transaction.blockHash);
  const receiptBlockHash = lowerHash(receipt.blockHash);
  const observedBlockHash = lowerHash(receiptBlock.hash);
  const observedBlockNumber = blockQuantity(receiptBlock.number);
  if (
    transactionHash !== expectedHash ||
    receiptHash !== expectedHash ||
    transaction.chainId !== BSC_CHAIN_ID ||
    walletAddress === null ||
    receiptWalletAddress !== walletAddress ||
    transactionTo === null ||
    receiptTo !== transactionTo ||
    transactionBlockNumber !== receiptBlockNumber ||
    transactionBlockHash === null ||
    receiptBlockHash !== transactionBlockHash ||
    observedBlockHash !== receiptBlockHash ||
    observedBlockNumber !== receiptBlockNumber ||
    receipt.status !== '0x1' ||
    BigInt(blockQuantity(finalizedBlock.number)) < BigInt(receiptBlockNumber)
  )
    throw invalid();

  const transactionTime = timestamp(receiptBlock.timestamp);
  const sourceQuantityBnb = positiveUnits(dataQuantity(transaction.value));
  const gasUsed = positiveBigInt(receipt.gasUsed);
  const effectiveGasPrice = positiveBigInt(receipt.effectiveGasPrice);
  const networkFeeQuantityBnb = units(gasUsed * effectiveGasPrice);
  const actualUsdtReceived = receivedUsdt(receipt.logs, walletAddress);
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
    walletAddress,
    sourceTokenAddress: BSC_NATIVE_BNB_ADDRESS.toLowerCase(),
    targetTokenAddress: BSC_USDT_ADDRESS.toLowerCase(),
    sourceQuantityBnb,
    actualUsdtReceived,
    networkFeeQuantityBnb,
    transactionTime,
    observedAt: new Date(observedAt),
  };
}

function referencedReceiptBlockHash(
  response: unknown,
  expectedHash: string,
): string {
  const receipt = rpcResults(response).get(2);
  if (
    receipt === undefined ||
    lowerHash(receipt.transactionHash) !== expectedHash
  )
    throw invalid();
  const blockHash = lowerHash(receipt.blockHash);
  if (blockHash === null) throw invalid();
  return blockHash;
}

function rpcResults(value: unknown): Map<number, Record<string, unknown>> {
  if (!Array.isArray(value) || value.length !== 3) throw invalid();
  const results = new Map<number, Record<string, unknown>>();
  for (const item of value) {
    const envelope = record(item);
    if (
      (envelope.id !== 1 && envelope.id !== 2 && envelope.id !== 3) ||
      envelope.jsonrpc !== '2.0' ||
      results.has(envelope.id)
    )
      throw invalid();
    results.set(envelope.id, record(envelope.result));
  }
  return results;
}

function rpcResult(
  value: unknown,
  expectedId: number,
): Record<string, unknown> {
  const envelope = record(value);
  if (envelope.jsonrpc !== '2.0' || envelope.id !== expectedId) throw invalid();
  return record(envelope.result);
}

function receivedUsdt(value: unknown, walletAddress: string): string {
  if (!Array.isArray(value)) throw invalid();
  const recipientTopic = `0x${walletAddress.slice(2).padStart(64, '0')}`;
  const matching = value.filter((entry) => {
    const log = record(entry);
    return (
      lowerAddress(log.address) === BSC_USDT_ADDRESS.toLowerCase() &&
      Array.isArray(log.topics) &&
      log.topics.length === 3 &&
      log.topics[0] === TRANSFER_TOPIC &&
      log.topics[2] === recipientTopic
    );
  });
  if (matching.length !== 1) throw invalid();
  return positiveUnits(dataQuantity(record(matching[0]).data));
}

function positiveUnits(value: string): string {
  const parsed = BigInt(value);
  if (parsed <= 0n) throw invalid();
  return units(parsed);
}

function units(value: bigint): string {
  return new ExactDecimal(value.toString())
    .div('1000000000000000000')
    .toFixed();
}

function positiveBigInt(value: unknown): bigint {
  const parsed = BigInt(dataQuantity(value));
  if (parsed <= 0n) throw invalid();
  return parsed;
}

function blockQuantity(value: unknown): string {
  if (typeof value !== 'string' || !BLOCK_QUANTITY_PATTERN.test(value))
    throw invalid();
  return value.toLowerCase();
}

function dataQuantity(value: unknown): string {
  if (typeof value !== 'string' || !DATA_QUANTITY_PATTERN.test(value))
    throw invalid();
  return value.toLowerCase();
}

function timestamp(value: unknown): Date {
  const seconds = BigInt(blockQuantity(value));
  if (seconds > BigInt(Number.MAX_SAFE_INTEGER)) throw invalid();
  const result = new Date(Number(seconds) * 1000);
  if (!Number.isFinite(result.getTime())) throw invalid();
  return result;
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
