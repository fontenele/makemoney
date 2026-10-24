import Decimal from 'decimal.js';

import {
  AgenticWalletFundingConversionPreBalanceReader,
  FundingConversionPreBalanceSnapshot,
} from '../application/agentic-wallet-funding-conversion-pre-balance.reader';
import { BSC_USDT_ADDRESS } from './agentic-wallet-funding-conversion-quote.adapter';

const RPC_URL = 'https://bsc-dataseed.bnbchain.org';
const TIMEOUT_MS = 10_000;
const ADDRESS_PATTERN = /^0x[0-9a-fA-F]{40}$/;
const QUANTITY_PATTERN = /^0x(?:0|[1-9a-f][0-9a-f]*)$/i;
const ExactDecimal = Decimal.clone({
  precision: 80,
  toExpNeg: -80,
  toExpPos: 80,
});
type HttpClient = (input: string, init?: RequestInit) => Promise<Response>;

export class BscFundingConversionPreBalanceReader extends AgenticWalletFundingConversionPreBalanceReader {
  constructor(
    private readonly http: HttpClient = fetch,
    private readonly now: () => Date = () => new Date(),
  ) {
    super();
  }

  async load(
    walletAddress: string,
    signal?: AbortSignal,
  ): Promise<FundingConversionPreBalanceSnapshot> {
    if (!ADDRESS_PATTERN.test(walletAddress))
      throw new Error('Funding conversion wallet address is invalid');
    const address = walletAddress.toLowerCase();
    const blockNumber = await this.requestBlockNumber(
      {
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_getBlockByNumber',
        params: ['finalized', false],
      },
      signal,
    );
    const paddedAddress = address.slice(2).padStart(64, '0');
    const values = await this.requestBatch(
      [
        {
          jsonrpc: '2.0',
          id: 2,
          method: 'eth_getBalance',
          params: [address, blockNumber],
        },
        {
          jsonrpc: '2.0',
          id: 3,
          method: 'eth_call',
          params: [
            { to: BSC_USDT_ADDRESS, data: `0x70a08231${paddedAddress}` },
            blockNumber,
          ],
        },
      ],
      signal,
    );
    const observedAt = this.now();
    if (!Number.isFinite(observedAt.getTime()))
      throw new Error('Funding conversion balance observation time is invalid');
    return {
      scope: 'agentic_wallet_funding_conversion_pre_balance_snapshot',
      chainId: '56',
      walletAddress: address,
      blockNumber,
      bnbBalance: units(values.get(2)),
      usdtBalance: units(values.get(3)),
      observedAt: new Date(observedAt),
    };
  }

  private async requestBlockNumber(
    body: object,
    signal?: AbortSignal,
  ): Promise<string> {
    const response = await this.post(body, signal);
    return quantity(record(record(response).result).number);
  }

  private async requestBatch(
    body: readonly object[],
    signal?: AbortSignal,
  ): Promise<Map<number, string>> {
    const response = await this.post(body, signal);
    if (!Array.isArray(response) || response.length !== 2)
      throw new Error('BSC balance response is invalid');
    const result = new Map<number, string>();
    for (const item of response) {
      const value = record(item);
      if ((value.id !== 2 && value.id !== 3) || result.has(value.id))
        throw new Error('BSC balance response identity is invalid');
      result.set(value.id, quantity(value.result));
    }
    return result;
  }

  private async post(body: object, signal?: AbortSignal): Promise<unknown> {
    const timeout = AbortSignal.timeout(TIMEOUT_MS);
    const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;
    const response = await this.http(RPC_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: combined,
    });
    if (!response.ok) throw new Error('BSC balance request failed');
    return response.json() as Promise<unknown>;
  }
}

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    throw new Error('BSC balance response is invalid');
  return value as Record<string, unknown>;
}

function quantity(value: unknown): string {
  if (typeof value !== 'string' || !QUANTITY_PATTERN.test(value))
    throw new Error('BSC balance quantity is invalid');
  return value.toLowerCase();
}

function units(value: string | undefined): string {
  if (value === undefined)
    throw new Error('BSC balance response is incomplete');
  return new ExactDecimal(BigInt(value).toString())
    .div('1000000000000000000')
    .toFixed();
}
