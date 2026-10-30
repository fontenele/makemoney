import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  GasDiagnosticBlockedError,
  GasDiagnosticPlan,
  GasDiagnosticRecord,
  GasDiagnosticStore,
} from '../application/gas-diagnostic-store';

type Row = {
  id: string;
  fingerprint: string;
  plan: GasDiagnosticPlan;
  state: GasDiagnosticRecord['state'];
  provider_order_id: string | null;
  expires_at: Date;
};

export class PrismaGasDiagnosticStore extends GasDiagnosticStore {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async prepare(plan: GasDiagnosticPlan) {
    const captured = structuredClone(plan);
    await this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(20261001, 18)`;
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(20261003, 34)`;
        const existing = await tx.$queryRaw<
          Row[]
        >`SELECT * FROM gas_diagnostics WHERE slot = 'single_btcb_gas_test' FOR UPDATE`;
        if (existing[0] && existing[0].state !== 'prepared')
          throw new GasDiagnosticBlockedError(
            'A diagnostic attempt already exists; automatic repetition is forbidden',
          );
        if (
          (await tx.realExecutionSubmissionAttempt.count()) ||
          (await tx.realExecutionReservation.count({
            where: { expiresAt: { gt: new Date() } },
          }))
        )
          throw new GasDiagnosticBlockedError(
            'Ordinary real execution activity requires review before this diagnostic',
          );
        const stop = await tx.riskControlEvent.findFirst({
          where: { control: 'emergency_stop' },
          orderBy: [{ changedAt: 'desc' }, { id: 'desc' }],
        });
        if (stop?.active)
          throw new GasDiagnosticBlockedError('Emergency stop is active');
        await tx.$executeRaw`INSERT INTO gas_diagnostics (id, slot, state, fingerprint, plan, expires_at) VALUES (${captured.id}::uuid, 'single_btcb_gas_test', 'prepared', ${captured.fingerprint}, ${JSON.stringify(captured)}::jsonb, ${new Date(captured.expiresAt)}) ON CONFLICT (slot) DO UPDATE SET id = EXCLUDED.id, fingerprint = EXCLUDED.fingerprint, plan = EXCLUDED.plan, expires_at = EXCLUDED.expires_at, created_at = now() WHERE gas_diagnostics.state = 'prepared'`;
      },
      { isolationLevel: 'Serializable' },
    );
  }

  async read(id: string): Promise<GasDiagnosticRecord | null> {
    const rows = await this.prisma.$queryRaw<
      Row[]
    >`SELECT * FROM gas_diagnostics WHERE id = ${id}::uuid`;
    const row = rows[0];
    return row
      ? {
          plan: row.plan,
          state: row.state,
          providerOrderId: row.provider_order_id,
        }
      : null;
  }

  async claim(id: string, fingerprint: string) {
    await this.prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(20261001, 18)`;
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(20261003, 34)`;
        const stop = await tx.riskControlEvent.findFirst({
          where: { control: 'emergency_stop' },
          orderBy: [{ changedAt: 'desc' }, { id: 'desc' }],
        });
        if (stop?.active)
          throw new GasDiagnosticBlockedError('Emergency stop is active');
        if (
          (await tx.realExecutionSubmissionAttempt.count()) ||
          (await tx.realExecutionReservation.count({
            where: { expiresAt: { gt: new Date() } },
          }))
        )
          throw new GasDiagnosticBlockedError(
            'Concurrent ordinary real execution blocks the diagnostic',
          );
        const changed =
          await tx.$executeRaw`UPDATE gas_diagnostics SET state = 'claimed', claimed_at = now() WHERE id = ${id}::uuid AND fingerprint = ${fingerprint} AND state = 'prepared' AND expires_at > now()`;
        if (changed !== 1)
          throw new GasDiagnosticBlockedError(
            'Diagnostic plan expired, changed or was already consumed',
          );
      },
      { isolationLevel: 'Serializable' },
    );
  }

  async recordOutcome(id: string, orderId: string | null) {
    await this.prisma
      .$executeRaw`UPDATE gas_diagnostics SET state = ${orderId ? 'submitted' : 'unknown'}, provider_order_id = ${orderId} WHERE id = ${id}::uuid AND state = 'claimed'`;
  }
}
