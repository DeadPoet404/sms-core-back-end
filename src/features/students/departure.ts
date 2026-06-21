import { authenticateRequest, RequestContext } from '../../shared/context';
import { hasPermission, PERMISSIONS } from '../../shared/rbac';

export type LifecycleStatus = 'ACTIVE' | 'GRADUATED' | 'TRANSFERRED' | 'EXPELLED';

export interface StudentRecord {
  id: string;
  tenantId: string;
  name: string;
  status: LifecycleStatus;
  transcriptData: string;
  outstandingBalance: number;
}

export class HistoricalDepartureEngine {
  private studentRecordsStore: Map<string, StudentRecord> = new Map();

  constructor(private jwtSecret: string) {}

  public seedRecord(record: StudentRecord): void {
    this.studentRecordsStore.set(record.id, record);
  }

  public archiveProfile(
    authHeader: string | undefined,
    studentId: string,
    targetStatus: Exclude<LifecycleStatus, 'ACTIVE'>
  ): { success: boolean; message?: string; error?: string } {
    let context: RequestContext;
    try {
      context = authenticateRequest(authHeader, this.jwtSecret);
    } catch (err: any) {
      return { success: false, error: `Security Intercept Failure: ${err.message}` };
    }

    if (!hasPermission(context.role, PERMISSIONS.STUDENT_DEPARTURE_WRITE)) {
      return { success: false, error: `RBAC Violation: Role [${context.role}] lacks authority to transition historical student lifecycles.` };
    }

    const record = this.studentRecordsStore.get(studentId);
    if (!record) {
      return { success: false, error: `Lookup Failure: Profile '${studentId}' does not exist inside active index lists.` };
    }

    if (record.tenantId !== context.tenantId) {
      return { success: false, error: 'Critical Security Alert: Cross-tenant data tampering attempt blocked.' };
    }

    record.status = targetStatus;
    console.log(`  -> [Lifecycle Mutation] Student ${studentId} state changed to ${targetStatus} by operator ${context.userId}`);
    return { success: true, message: `Profile state updated successfully to ${targetStatus}. Academic paths are frozen.` };
  }

  public modifyTranscript(
    authHeader: string | undefined,
    studentId: string,
    updatedGradesJSON: string
  ): { success: boolean; message?: string; error?: string } {
    let context: RequestContext;
    try {
      context = authenticateRequest(authHeader, this.jwtSecret);
    } catch (err: any) {
      return { success: false, error: `Security Intercept Failure: ${err.message}` };
    }

    const record = this.studentRecordsStore.get(studentId);
    if (!record || record.tenantId !== context.tenantId) {
      return { success: false, error: 'Access Denied: Record not found or tenant scope mismatch.' };
    }

    if (record.status !== 'ACTIVE') {
      return { 
        success: false, 
        error: `Domain Rule Violation: Transcripts are read-only! Profile status is currently '${record.status}'. Historical records cannot be backdated.` 
      };
    }

    record.transcriptData = updatedGradesJSON;
    return { success: true, message: 'Academic ledger record updated cleanly.' };
  }

  public postLegacyPayment(
    authHeader: string | undefined,
    studentId: string,
    amountPaid: number
  ): { success: boolean; remainingDebt?: number; error?: string } {
    let context: RequestContext;
    try {
      context = authenticateRequest(authHeader, this.jwtSecret);
    } catch (err: any) {
      return { success: false, error: `Security Intercept Failure: ${err.message}` };
    }

    const record = this.studentRecordsStore.get(studentId);
    if (!record || record.tenantId !== context.tenantId) {
      return { success: false, error: 'Access Denied: Record not found or tenant scope mismatch.' };
    }

    record.outstandingBalance = Math.max(0, record.outstandingBalance - amountPaid);
    console.log(`  -> [Treasury Transaction Log] Settle request for ${studentId}. Applied $${amountPaid}. Bal: $${record.outstandingBalance}`);
    return { success: true, remainingDebt: record.outstandingBalance };
  }
}
