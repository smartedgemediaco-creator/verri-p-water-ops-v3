import connectDB from "./db";
import { ActivityLog } from "./models/ActivityLog";

interface LogActivityOptions {
  action: string;
  entity: string;
  entityId: string;
  description: string;
  userId?: string;
  metadata?: Record<string, any>;
  domainType?: "factory" | "depot";
  domainId?: string;
  productId?: string;
}

export async function logActivity(opts: LogActivityOptions) {
  await connectDB();
  await ActivityLog.create({
    action: opts.action,
    entity: opts.entity,
    entityId: opts.entityId,
    description: opts.description,
    userId: opts.userId,
    metadata: opts.metadata,
    domainType: opts.domainType,
    domainId: opts.domainId,
    productId: opts.productId,
  });
}
