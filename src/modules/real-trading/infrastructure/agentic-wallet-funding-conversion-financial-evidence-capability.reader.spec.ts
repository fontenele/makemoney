import { FUNDING_CONVERSION_FINANCIAL_EVIDENCE_CAPABILITY_REVIEW } from './agentic-wallet-funding-conversion-financial-evidence-capability.reader';

describe('funding conversion financial evidence capability review', () => {
  it('records complete evidence composition without granting activation', () => {
    expect(FUNDING_CONVERSION_FINANCIAL_EVIDENCE_CAPABILITY_REVIEW).toEqual({
      provider: 'agentic_wallet',
      cliVersion: '1.10.0',
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
    });
  });
});
