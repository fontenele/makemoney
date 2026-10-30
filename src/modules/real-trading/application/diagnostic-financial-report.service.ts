import { GasDiagnosticStore } from './gas-diagnostic-store';
import { GasDiagnosticTransport } from './gas-diagnostic.service';
import {
  buildDiagnosticFinancialReport,
  DiagnosticFinancialReport,
  DiagnosticReceiptsReader,
} from './diagnostic-financial-report';

export class InvalidDiagnosticReportRequestError extends Error {}
export class DiagnosticReportBlockedError extends Error {}
export abstract class DiagnosticFinancialReportStore {
  abstract save(
    report: DiagnosticFinancialReport,
  ): Promise<{ report: DiagnosticFinancialReport; replayed: boolean }>;
  abstract latest(): Promise<DiagnosticFinancialReport | null>;
}

/** Read public receipts and persist an audit report; no executor dependency. */
export class DiagnosticFinancialReportService {
  private busy = false;
  constructor(
    private readonly diagnostics: Pick<GasDiagnosticStore, 'read'>,
    private readonly status: Pick<GasDiagnosticTransport, 'measure'>,
    private readonly receipts: DiagnosticReceiptsReader,
    private readonly store: DiagnosticFinancialReportStore,
  ) {}

  async record(body: unknown) {
    if (
      !object(body) ||
      Object.keys(body).sort().join(',') !==
        'approvalTransactionHash,planId,revocationTransactionHash' ||
      typeof body.planId !== 'string' ||
      !/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(
        body.planId,
      ) ||
      typeof body.approvalTransactionHash !== 'string' ||
      !/^0x[a-f0-9]{64}$/.test(body.approvalTransactionHash) ||
      typeof body.revocationTransactionHash !== 'string' ||
      !/^0x[a-f0-9]{64}$/.test(body.revocationTransactionHash) ||
      body.approvalTransactionHash === body.revocationTransactionHash
    )
      throw new InvalidDiagnosticReportRequestError(
        'Expected planId and distinct canonical approval/revocation hashes',
      );
    if (this.busy)
      throw new DiagnosticReportBlockedError(
        'Diagnostic report acquisition is already in progress',
      );
    const { planId, approvalTransactionHash, revocationTransactionHash } = body;
    this.busy = true;
    try {
      const diagnostic = await this.diagnostics.read(planId);
      if (
        !diagnostic ||
        diagnostic.state !== 'submitted' ||
        !diagnostic.providerOrderId
      )
        throw new DiagnosticReportBlockedError(
          'A submitted diagnostic with a known provider order is required',
        );
      const status: unknown = await this.status.measure(
        diagnostic.providerOrderId,
        diagnostic.plan.walletHash,
      );
      if (
        !object(status) ||
        status.executionSucceeded !== true ||
        status.gasMeasurementAvailable !== true ||
        typeof status.transactionHash !== 'string' ||
        !/^0x[a-f0-9]{64}$/.test(status.transactionHash)
      )
        throw new DiagnosticReportBlockedError(
          'Successful finalized diagnostic receipt is required',
        );
      const bundle = await this.receipts.load({
        swapHash: status.transactionHash,
        approvalHash: approvalTransactionHash,
        revocationHash: revocationTransactionHash,
        walletHash: diagnostic.plan.walletHash,
      });
      const report = buildDiagnosticFinancialReport(diagnostic.plan, bundle);
      const saved = await this.store.save(report);
      return {
        scope: 'diagnostic_financial_report' as const,
        status: 'recorded' as const,
        ...saved,
        submissionAuthorized: false,
      };
    } finally {
      this.busy = false;
    }
  }

  async read() {
    const report = await this.store.latest();
    return {
      scope: 'diagnostic_financial_report' as const,
      status: report ? 'available' : 'unavailable',
      report,
      providerAccessPerformed: false,
      submissionAuthorized: false,
    };
  }
}
function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
