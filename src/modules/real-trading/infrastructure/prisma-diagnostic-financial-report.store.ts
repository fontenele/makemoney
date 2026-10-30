import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  DiagnosticFinancialReport,
  diagnosticReportFingerprint,
} from '../application/diagnostic-financial-report';
import {
  DiagnosticFinancialReportStore,
  DiagnosticReportBlockedError,
} from '../application/diagnostic-financial-report.service';

type ReportRow = {
  diagnostic_id: string;
  fingerprint: string;
  report: DiagnosticFinancialReport;
};
export class PrismaDiagnosticFinancialReportStore extends DiagnosticFinancialReportStore {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async save(input: DiagnosticFinancialReport) {
    const report = structuredClone(input);
    validate({
      diagnostic_id: report.planId,
      fingerprint: report.fingerprint,
      report,
    });
    return this.prisma.$transaction(async (tx) => {
      const parents = await tx.$queryRaw<
        Array<{
          state: string;
          fingerprint: string;
          provider_order_id: string | null;
        }>
      >`SELECT state, fingerprint, provider_order_id FROM gas_diagnostics WHERE id = ${report.planId}::uuid FOR SHARE`;
      if (
        parents.length !== 1 ||
        parents[0].state !== 'submitted' ||
        !parents[0].provider_order_id ||
        parents[0].fingerprint !== report.planFingerprint
      )
        throw new DiagnosticReportBlockedError(
          'Diagnostic report is not bound to its submitted plan',
        );
      const changed =
        await tx.$executeRaw`INSERT INTO gas_diagnostic_financial_reports (diagnostic_id, fingerprint, report) VALUES (${report.planId}::uuid, ${report.fingerprint}, ${JSON.stringify(report)}::jsonb) ON CONFLICT (diagnostic_id) DO NOTHING`;
      const rows = await tx.$queryRaw<
        ReportRow[]
      >`SELECT * FROM gas_diagnostic_financial_reports WHERE diagnostic_id = ${report.planId}::uuid`;
      if (rows.length !== 1)
        throw new Error('Diagnostic report persistence failed');
      validate(rows[0]);
      if (rows[0].fingerprint !== report.fingerprint)
        throw new DiagnosticReportBlockedError(
          'Diagnostic financial facts cannot be rewritten',
        );
      return { report: rows[0].report, replayed: changed === 0 };
    });
  }

  async latest() {
    const rows = await this.prisma.$queryRaw<
      ReportRow[]
    >`SELECT * FROM gas_diagnostic_financial_reports ORDER BY created_at DESC LIMIT 1`;
    if (!rows[0]) return null;
    validate(rows[0]);
    return rows[0].report;
  }
}
function validate(row: ReportRow) {
  if (
    row.report?.version !== 'diagnostic_financial_report_v1' ||
    row.report.planId !== row.diagnostic_id ||
    row.report.fingerprint !== row.fingerprint ||
    row.report.submissionAuthorized !== false ||
    row.report.globalAccountingMutated !== false ||
    diagnosticReportFingerprint(row.report) !== row.fingerprint ||
    typeof row.report.observedAt !== 'string' ||
    !Number.isFinite(new Date(row.report.observedAt).getTime())
  )
    throw new Error('Stored diagnostic report integrity check failed');
}
