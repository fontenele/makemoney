import {
  AgenticWalletFundingConversionActivationBlocker,
  AgenticWalletFundingConversionPlan,
} from './agentic-wallet-funding-conversion-plan.service';

export interface AgenticWalletFundingConversionPlanRecord {
  readonly plan: AgenticWalletFundingConversionPlan;
  readonly confirmationPhraseDigest: string;
  readonly activationBlockers: readonly AgenticWalletFundingConversionActivationBlocker[];
  readonly executionConfigurationReady: boolean;
  readonly preparedAt: Date;
}

export interface StoredAgenticWalletFundingConversionPlan extends AgenticWalletFundingConversionPlanRecord {
  readonly stored: true;
}

export abstract class AgenticWalletFundingConversionPlanStore {
  abstract create(
    record: AgenticWalletFundingConversionPlanRecord,
  ): Promise<StoredAgenticWalletFundingConversionPlan>;
}
