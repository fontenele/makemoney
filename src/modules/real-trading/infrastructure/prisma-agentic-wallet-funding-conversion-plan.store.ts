import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  AgenticWalletFundingConversionPlanRecord,
  AgenticWalletFundingConversionPlanStore,
  StoredAgenticWalletFundingConversionPlan,
} from '../application/agentic-wallet-funding-conversion-plan.store';

@Injectable()
export class PrismaAgenticWalletFundingConversionPlanStore implements AgenticWalletFundingConversionPlanStore {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    record: AgenticWalletFundingConversionPlanRecord,
  ): Promise<StoredAgenticWalletFundingConversionPlan> {
    validateRecord(record);
    await this.prisma.agenticWalletFundingConversionPlan.create({
      data: {
        id: record.plan.id,
        fingerprint: record.plan.fingerprint,
        confirmationPhraseDigest: record.confirmationPhraseDigest,
        providerId: record.plan.provider,
        chainId: record.plan.chainId,
        sourceTokenAddress: record.plan.sourceTokenAddress.toLowerCase(),
        targetTokenAddress: record.plan.targetTokenAddress.toLowerCase(),
        sourceQuantityBnb: record.plan.sourceQuantityBnb,
        expectedUsdt: record.plan.expectedUsdt,
        minimumUsdt: record.plan.minimumUsdt,
        maximumSlippagePercent: record.plan.maximumSlippagePercent,
        remainingQuantityBnb: record.plan.remainingQuantityBnb,
        minimumGasReserveBnb: record.plan.minimumGasReserveBnb,
        mevProtection: record.plan.mevProtection,
        gasLevel: record.plan.gasLevel,
        costCoverage: record.plan.costCoverage,
        gasReserveSufficiency: record.plan.gasReserveSufficiency,
        activationBlockers: [...record.activationBlockers],
        executionConfigurationReady: record.executionConfigurationReady,
        quotedAt: new Date(record.plan.quotedAt),
        quoteExpiresAt: new Date(record.plan.expiresAt),
        confirmationExpiresAt: new Date(record.plan.confirmationExpiresAt),
        preparedAt: new Date(record.preparedAt),
      },
    });
    return cloneRecord(record);
  }
}

function validateRecord(
  record: AgenticWalletFundingConversionPlanRecord,
): void {
  if (
    typeof record !== 'object' ||
    record === null ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(
      record.plan.id,
    ) ||
    !/^[a-f0-9]{64}$/.test(record.plan.fingerprint) ||
    !/^[a-f0-9]{64}$/.test(record.confirmationPhraseDigest) ||
    !(record.preparedAt instanceof Date) ||
    !Number.isFinite(record.preparedAt.getTime()) ||
    record.plan.quotedAt.getTime() > record.preparedAt.getTime() ||
    record.plan.expiresAt.getTime() <= record.preparedAt.getTime() ||
    record.plan.confirmationExpiresAt.getTime() <=
      record.preparedAt.getTime() ||
    record.executionConfigurationReady !==
      (record.activationBlockers.length === 0)
  ) {
    throw new Error('Agentic Wallet funding conversion plan record is invalid');
  }
}

function cloneRecord(
  record: AgenticWalletFundingConversionPlanRecord,
): StoredAgenticWalletFundingConversionPlan {
  return {
    plan: {
      ...record.plan,
      quotedAt: new Date(record.plan.quotedAt),
      expiresAt: new Date(record.plan.expiresAt),
      confirmationExpiresAt: new Date(record.plan.confirmationExpiresAt),
      command: {
        ...record.plan.command,
        arguments: [...record.plan.command.arguments],
      },
    },
    confirmationPhraseDigest: record.confirmationPhraseDigest,
    activationBlockers: [...record.activationBlockers],
    executionConfigurationReady: record.executionConfigurationReady,
    preparedAt: new Date(record.preparedAt),
    stored: true,
  };
}
