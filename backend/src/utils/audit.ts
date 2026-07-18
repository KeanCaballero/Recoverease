import prisma from '../lib/prisma';

export async function writeAuditLog(
  userId: number,
  action: string,
  entity: string,
  entityId?: number,
  details?: string,
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: { userId, auditLogAction: action, auditLogEntity: entity, auditLogEntityId: entityId, auditLogDetails: details },
    });
  } catch {
    // Non-blocking — never fail the main request because of audit
    console.error('[AuditLog] Failed to write:', { userId, action, entity });
  }
}
