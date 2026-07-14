import type { Prisma, PrismaClient } from '@prisma/client';

type Db = PrismaClient | Prisma.TransactionClient;

export async function audit(db: Db, input: {
  actorUserId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
  requestId?: string;
  metadata?: Prisma.InputJsonValue;
}) {
  await db.auditEvent.create({ data: {
    actorUserId: input.actorUserId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    beforeJson: input.before,
    afterJson: input.after,
    requestId: input.requestId,
    metadata: input.metadata,
  } });
}
