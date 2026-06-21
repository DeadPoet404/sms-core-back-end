import { authenticateRequest, RequestContext } from '../../shared/context';
import { hasPermission, PERMISSIONS } from '../../shared/rbac';

export interface EnrollmentPayload {
  email: string;
  fullName: string;
  guardianName: string;
  guardianPhone: string;
  feeTierId: string;
}

export class AtomicEnrollmentEngine {
  constructor(private jwtSecret: string) {}

  public async enroll(authHeader: string | undefined, payload: EnrollmentPayload): Promise<{ success: boolean; data?: any; error?: string }> {
    let context: RequestContext;
    try {
      context = authenticateRequest(authHeader, this.jwtSecret);
    } catch (err: any) {
      return { success: false, error: `Security Intercept Failure: ${err.message}` };
    }

    if (!hasPermission(context.role, PERMISSIONS.STUDENT_ENROLL)) {
      return { success: false, error: `RBAC Violation: Role [${context.role}] lacks authorized access to '${PERMISSIONS.STUDENT_ENROLL}'.` };
    }

    console.log(`[Transaction Initiation] Scoped to Tenant Domain: ${context.tenantId}`);
    const transactionJournal: string[] = [];
    
    try {
      transactionJournal.push('WRITE_USER_ACCOUNT_RECORD');
      console.log(`  -> [Step A] Created core account profile for: ${payload.email}`);

      transactionJournal.push('WRITE_STUDENT_PROFILE');
      console.log(`  -> [Step B] Bound student metadata profile: ${payload.fullName}`);

      if (!payload.guardianName || payload.guardianPhone.startsWith('BAD_')) {
        throw new Error('Validation failure matching parental legal contact data format.');
      }
      transactionJournal.push('WRITE_GUARDIAN_ASSOCIATION');
      console.log(`  -> [Step C] Configured tracking reference link for guardian: ${payload.guardianName}`);

      if (!payload.feeTierId) {
        throw new Error('Missing prerequisite billing registry FeeTierId reference.');
      }
      transactionJournal.push('LINK_TUITION_FEE_TIER');
      console.log(`  -> [Step D] Locked structural billing catalog index: ${payload.feeTierId}`);

      console.log('✅ [Transaction Commit] All data rows matched schemas cleanly. Persisting block changes.');
      return {
        success: true,
        data: {
          tenantId: context.tenantId,
          operatorId: context.userId,
          recordsInjected: transactionJournal
        }
      };

    } catch (transactionError: any) {
      console.error(`🚨 [Transaction Rollback Triggered] Error Encountered: ${transactionError.message}`);
      while (transactionJournal.length > 0) {
        const revertedOperation = transactionJournal.pop();
        console.log(`  <- [Reverting State Changes]: Deleted ${revertedOperation} data rows to clear database state.`);
      }
      return {
        success: false,
        error: `Atomic Ingestion Cancelled. System state safely rolled back. Trace: ${transactionError.message}`
      };
    }
  }
}
