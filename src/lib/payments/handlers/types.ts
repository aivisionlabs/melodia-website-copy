import type { db as dbInstance } from '@/lib/db';
import type { paymentsTable, songRequestsTable, packagesTable } from '@/lib/db/schema';
import type { ApiLoggerContext } from '@/lib/logger/api-middleware';

export interface PaymentSuccessContext {
  paymentId: number;
  requestId: string;
  payment: typeof paymentsTable.$inferSelect;
  songRequest: typeof songRequestsTable.$inferSelect;
  packageData: typeof packagesTable.$inferSelect | null;
  db: typeof dbInstance;
  logger: ApiLoggerContext['logger'];
  origin: string;
}

export interface HandlerResult {
  songId?: number;
  redirectUrl?: string;
  isPrimeCustomer?: boolean;
  templatedInstanceSlug?: string;
  message: string;
}

export class HandlerError extends Error {
  readonly status: number;
  constructor(message: string, status: number = 500) {
    super(message);
    this.name = 'HandlerError';
    this.status = status;
  }
}
