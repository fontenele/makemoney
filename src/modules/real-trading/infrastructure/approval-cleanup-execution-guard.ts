import { Prisma } from '../../../generated/prisma/client';
/** Use only inside the ordinary entry transaction; the lock is held until commit. */
export async function assertNoUnresolvedApprovalCleanup(
  tx: Pick<Prisma.TransactionClient, '$executeRaw' | '$queryRaw'>,
): Promise<void> {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(20261030, 215)`;
  const rows = await tx.$queryRaw<
    Array<{ id: string }>
  >`SELECT id FROM approval_cleanup_obligations WHERE state <> 'cleared' LIMIT 1`;
  if (rows.length)
    throw new Error('An unresolved approval cleanup blocks ordinary execution');
}
