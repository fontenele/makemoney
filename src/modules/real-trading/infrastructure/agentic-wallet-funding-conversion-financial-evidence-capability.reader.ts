import { REQUIRED_AGENTIC_WALLET_CLI_VERSION } from './agentic-wallet-cli-version';

export const FUNDING_CONVERSION_FINANCIAL_EVIDENCE_CAPABILITY_REVIEW = {
  provider: 'agentic_wallet',
  cliVersion: REQUIRED_AGENTIC_WALLET_CLI_VERSION,
  reviewedAt: '2026-10-24',
  availableFacts: [
    'terminal_market_order_status',
    'confirmed_transaction_details',
    'transaction_send_and_receive_instructions',
    'network_fee',
    'current_bnb_balance',
    'current_usdt_balance',
    'authoritative_provider_fee_schedule',
    'realtime_quote_provider_fee',
    'fixed_block_pre_and_post_balances',
    'complete_financial_evidence_composition',
  ],
  blockers: [],
  completeEvidenceAcquisitionAvailable: true,
  fundingConversionActivationAllowed: false,
} as const;
