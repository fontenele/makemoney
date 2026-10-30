import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  ApprovalCleanupEvent,
  ApprovalCleanupPlan,
  ApprovalCleanupRecord,
  approvalCleanupPlanFingerprint,
  newApprovalCleanup,
  transitionApprovalCleanup,
} from '../application/approval-cleanup';
type Row = {
  id: string;
  operation_id: string;
  wallet_hash: string;
  fingerprint: string;
  state: string;
  record: ApprovalCleanupRecord;
};
/** Unregistered local persistence only. No runner, route or wallet dependency. */
export class PrismaApprovalCleanupStore {
  constructor(
    private readonly prisma: PrismaService,
    private readonly now: () => Date = () => new Date(),
  ) {}
  async register(input: ApprovalCleanupPlan) {
    const record = newApprovalCleanup(structuredClone(input));
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(20261030, 215)`;
      const rows = await tx.$queryRaw<
        Row[]
      >`SELECT * FROM approval_cleanup_obligations WHERE operation_id = ${record.plan.operationId}::uuid`;
      if (rows[0]) {
        validate(rows[0]);
        if (
          rows[0].id !== record.plan.id ||
          rows[0].fingerprint !== record.fingerprint
        )
          throw new Error('Approval-cleanup operation conflicts');
        return { record: rows[0].record, replayed: true };
      }
      await tx.$executeRaw`INSERT INTO approval_cleanup_obligations (id, operation_id, wallet_hash, fingerprint, state, record) VALUES (${record.plan.id}::uuid, ${record.plan.operationId}::uuid, ${record.plan.walletHash}, ${record.fingerprint}, ${record.state}, ${JSON.stringify(record)}::jsonb)`;
      return { record, replayed: false };
    });
  }
  async transition(
    id: string,
    fingerprint: string,
    input: ApprovalCleanupEvent,
  ) {
    if (!/^[a-f0-9-]{36}$/.test(id) || !/^[a-f0-9]{64}$/.test(fingerprint))
      throw new Error('Invalid cleanup identity');
    const event = structuredClone(input);
    if (event.type === 'receipt' && input.type === 'receipt')
      event.evidence.observedAt = new Date(input.evidence.observedAt.getTime());
    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<
        Row[]
      >`SELECT * FROM approval_cleanup_obligations WHERE id = ${id}::uuid FOR UPDATE`;
      if (!rows[0]) throw new Error('Approval-cleanup obligation not found');
      validate(rows[0]);
      if (rows[0].fingerprint !== fingerprint)
        throw new Error('Approval-cleanup identity diverged');
      const record = transitionApprovalCleanup(
        rows[0].record,
        event,
        this.now(),
      );
      await tx.$executeRaw`UPDATE approval_cleanup_obligations SET state = ${record.state}, record = ${JSON.stringify(record)}::jsonb, updated_at = now() WHERE id = ${id}::uuid`;
      return record;
    });
  }
  async unresolved(walletHash: string) {
    if (!/^[a-f0-9]{64}$/.test(walletHash))
      throw new Error('Invalid wallet digest');
    const rows = await this.prisma.$queryRaw<
      Row[]
    >`SELECT * FROM approval_cleanup_obligations WHERE wallet_hash = ${walletHash} AND state <> 'cleared'`;
    for (const row of rows) validate(row);
    return rows.map((row) => row.record);
  }
}
function validate(row: Row) {
  if (
    row.id !== row.record?.plan?.id ||
    row.operation_id !== row.record.plan.operationId ||
    row.wallet_hash !== row.record.plan.walletHash ||
    row.state !== row.record.state ||
    row.fingerprint !== row.record.fingerprint ||
    approvalCleanupPlanFingerprint(row.record.plan) !== row.fingerprint
  )
    throw new Error('Approval-cleanup integrity check failed');
}
