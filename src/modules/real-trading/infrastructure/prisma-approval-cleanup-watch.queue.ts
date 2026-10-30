import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { CleanupWatchQueue } from '../application/approval-cleanup-watch.service';
export class PrismaApprovalCleanupWatchQueue implements CleanupWatchQueue {
  constructor(private readonly prisma: PrismaService) {}
  async list() {
    const rows = await this.prisma.$queryRaw<
      Array<{ wallet_hash: string; state: string }>
    >`SELECT wallet_hash,state FROM approval_cleanup_obligations WHERE state <> 'cleared' ORDER BY created_at LIMIT 2`;
    return rows.map((row) => ({
      walletHash: row.wallet_hash,
      state: row.state,
    }));
  }
}
