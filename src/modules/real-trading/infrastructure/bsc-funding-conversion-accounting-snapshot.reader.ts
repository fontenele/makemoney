import Decimal from 'decimal.js';

import {
  AgenticWalletFundingConversionAccountingSnapshotReader,
  FundingConversionAccountingSnapshot,
  FundingConversionAccountingSnapshotBalance,
} from '../application/agentic-wallet-funding-conversion-accounting-snapshot.reader';
import { APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT } from '../application/real-execution-instrument-approval';

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

export class BscFundingConversionAccountingSnapshotReader extends AgenticWalletFundingConversionAccountingSnapshotReader {
  constructor(
    private readonly http: HttpClient = fetch,
    private readonly now: () => Date = () => new Date(),
  ) {
    super();
  }

  async load(
    walletAddress: string,
    signal?: AbortSignal,
  ): Promise<FundingConversionAccountingSnapshot> {
    if (!ADDRESS_PATTERN.test(walletAddress))
      throw new Error('Funding conversion accounting wallet is invalid');
    const address = walletAddress.toLowerCase();
    const blockNumber = await this.blockNumber(signal);
    const paddedAddress = address.slice(2).padStart(64, '0');
    const instrument = APPROVED_AGENTIC_WALLET_BSC_BTCB_USDT_INSTRUMENT;
    const quantities = await this.batch(
      [
        {
          jsonrpc: '2.0',
          id: 2,
          method: 'eth_getBalance',
          params: [address, blockNumber],
        },
        tokenBalanceRequest(
          3,
          instrument.usdt.tokenAddress,
          paddedAddress,
          blockNumber,
        ),
        tokenBalanceRequest(
          4,
          instrument.btc.tokenAddress,
          paddedAddress,
          blockNumber,
        ),
      ],
      signal,
    );
    const observedAt = this.now();
    if (!Number.isFinite(observedAt.getTime()))
      throw new Error(
        'Funding conversion accounting observation time is invalid',
      );
    const balances: FundingConversionAccountingSnapshotBalance[] = [
      {
        assetIdentity: 'native:BNB',
        assetType: 'native',
        assetAddress: null,
        assetSymbol: 'BNB',
        quantity: units(quantities.get(2)),
      },
      {
        assetIdentity: `token:${instrument.usdt.tokenAddress}`,
        assetType: 'token',
        assetAddress: instrument.usdt.tokenAddress,
        assetSymbol: null,
        quantity: units(quantities.get(3)),
      },
      {
        assetIdentity: `token:${instrument.btc.tokenAddress}`,
        assetType: 'token',
        assetAddress: instrument.btc.tokenAddress,
        assetSymbol: null,
        quantity: units(quantities.get(4)),
      },
    ];
    return {
      scope: 'agentic_wallet_funding_conversion_accounting_snapshot',
      chainId: '56',
      walletAddress: address,
      blockNumber,
      balances: balances.sort((left, right) =>
        left.assetIdentity.localeCompare(right.assetIdentity),
      ),
      observedAt: new Date(observedAt),
    };
  }

  private async blockNumber(signal?: AbortSignal): Promise<string> {
    const response = await this.post(
      {
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_getBlockByNumber',
        params: ['finalized', false],
      },
      signal,
    );
    return quantity(record(record(response).result).number);
  }

  private async batch(
    body: readonly object[],
    signal?: AbortSignal,
  ): Promise<Map<number, string>> {
    const response = await this.post(body, signal);
    if (!Array.isArray(response) || response.length !== 3)
      throw new Error('BSC accounting balance response is invalid');
    const result = new Map<number, string>();
    for (const item of response) {
      const value = record(item);
      if (
        (value.id !== 2 && value.id !== 3 && value.id !== 4) ||
        result.has(value.id)
      )
        throw new Error('BSC accounting balance identity is invalid');
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
    if (!response.ok) throw new Error('BSC accounting balance request failed');
    return response.json() as Promise<unknown>;
  }
}

function tokenBalanceRequest(
  id: number,
  tokenAddress: string,
  paddedAddress: string,
  blockNumber: string,
): object {
  return {
    jsonrpc: '2.0',
    id,
    method: 'eth_call',
    params: [
      { to: tokenAddress, data: `0x70a08231${paddedAddress}` },
      blockNumber,
    ],
  };
}

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value))
    throw new Error('BSC accounting balance response is invalid');
  return value as Record<string, unknown>;
}

function quantity(value: unknown): string {
  if (typeof value !== 'string' || !QUANTITY_PATTERN.test(value))
    throw new Error('BSC accounting balance quantity is invalid');
  return value.toLowerCase();
}

function units(value: string | undefined): string {
  if (value === undefined)
    throw new Error('BSC accounting balance response is incomplete');
  return new ExactDecimal(BigInt(value).toString())
    .div('1000000000000000000')
    .toFixed();
}
