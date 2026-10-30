import { createHash } from 'node:crypto';
import { GasDiagnosticPlan } from '../../src/modules/real-trading/application/gas-diagnostic-store';
import {
  DiagnosticReceipt,
  DiagnosticReceiptBundle,
} from '../../src/modules/real-trading/application/diagnostic-financial-report';
export const diagnosticOwner = '0x' + 'a'.repeat(40);
export const diagnosticRouter = '0x' + 'b'.repeat(40);
const usdt = '0x55d398326f99059ff775485246999027b3197955';
const btcb = '0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c';
const transfer =
  '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
export function diagnosticPlan(): GasDiagnosticPlan {
  return {
    id: '00000000-0000-4000-8000-000000000501',
    fingerprint: 'a'.repeat(64),
    walletHash: createHash('sha256').update(diagnosticOwner).digest('hex'),
    expectedBtcb: '0.0000129',
    minimumBtcb: '0.0000128',
    slippageRate: '0.005',
    nativeBnbAtRisk: '0.005',
    referenceBnbUsdt: '700.29',
    networkBudgetUsdt: '0.5',
    maximumPotentialLossUsdt: '4.5',
    createdAt: '2026-10-30T14:00:00.000Z',
    expiresAt: '2026-10-30T14:03:00.000Z',
  };
}
function receipt(index: number): DiagnosticReceipt {
  return {
    hash: '0x' + String(index).repeat(64),
    from: diagnosticOwner,
    to: diagnosticRouter,
    input: '0x1234',
    nonce: String(index),
    valueWei: '0',
    blockNumber: String(100 + index),
    blockHash: '0x' + String(index + 3).repeat(64),
    gasUsed: '843353',
    effectiveGasPriceWei: '74166644',
    succeeded: true,
    logs: [],
  };
}
function log(token: string, from: string, to: string, value: bigint) {
  return {
    address: token,
    topics: [
      transfer,
      '0x' + from.slice(2).padStart(64, '0'),
      '0x' + to.slice(2).padStart(64, '0'),
    ],
    data: '0x' + value.toString(16).padStart(64, '0'),
  };
}
export function diagnosticBundle(): DiagnosticReceiptBundle {
  const approval = receipt(1),
    swap = receipt(2),
    revocation = receipt(3);
  approval.to = usdt;
  approval.nonce = '1';
  approval.gasUsed = '46482';
  approval.effectiveGasPriceWei = '69779579';
  approval.input =
    '0x095ea7b3' +
    diagnosticRouter.slice(2).padStart(64, '0') +
    ((1n << 256n) - 1n).toString(16);
  swap.nonce = '2';
  swap.logs = [
    log(usdt, diagnosticOwner, diagnosticRouter, 1000000000000000000n),
    log(btcb, diagnosticRouter, diagnosticOwner, 12907690498746n),
  ];
  revocation.to = usdt;
  revocation.nonce = '4';
  revocation.gasUsed = '24198';
  revocation.effectiveGasPriceWei = '91503142';
  revocation.input =
    '0x095ea7b3' + diagnosticRouter.slice(2).padStart(64, '0') + '0'.repeat(64);
  return {
    chainId: '56',
    swap,
    approval,
    revocation,
    finalizedBlockNumber: '110',
    usdtDecimals: 18,
    btcbDecimals: 18,
    currentAllowanceRaw: '0',
    observedAt: new Date('2026-10-30T16:00:00.000Z'),
  };
}
