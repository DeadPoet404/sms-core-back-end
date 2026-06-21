import { authenticateRequest, RequestContext } from '../../shared/context';
import { hasPermission, PERMISSIONS } from '../../shared/rbac';

export type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface LeaveRequest {
  id: string;
  tenantId: string;
  studentId: string;
  details: string;
  proofUrl: string;
  status: LeaveStatus;
  reviewedBy?: string;
}

export class LeavePipelineEngine {
  private leaveRegistry: Map<string, LeaveRequest> = new Map();
  private incrementId = 1;

  constructor(private jwtSecret: string) {}

  public submitRequest(
    authHeader: string | undefined,
    studentId: string,
    details: string,
    proofUrl: string
  ): { success: boolean; data?: LeaveRequest; error?: string } {
    let context: RequestContext;
    try {
      context = authenticateRequest(authHeader, this.jwtSecret);
    } catch (err: any) {
      return { success: false, error: `Security Intercept Failure: ${err.message}` };
    }

    if (!hasPermission(context.role, PERMISSIONS.STUDENT_LEAVE_WRITE)) {
      return { success: false, error: `RBAC Violation: Role [${context.role}] cannot log leave requests.` };
    }

    if (!proofUrl || !proofUrl.startsWith('https://')) {
      return { success: false, error: 'Validation Failure: A secure CDN reference link (HTTPS) for proof is mandatory.' };
    }

    const newRequest: LeaveRequest = {
      id: `lv_req_${this.incrementId++}`,
      tenantId: context.tenantId,
      studentId,
      details,
      proofUrl,
      status: 'PENDING'
    };

    this.leaveRegistry.set(newRequest.id, newRequest);
    console.log(`  -> [Leave Submitted] Generated ${newRequest.id} for student ${studentId} under tenant ${context.tenantId}`);
    return { success: true, data: newRequest };
  }

  public evaluateRequest(
    authHeader: string | undefined,
    requestId: string,
    nextStatus: 'APPROVED' | 'REJECTED'
  ): { success: boolean; data?: LeaveRequest; error?: string } {
    let context: RequestContext;
    try {
      context = authenticateRequest(authHeader, this.jwtSecret);
    } catch (err: any) {
      return { success: false, error: `Security Intercept Failure: ${err.message}` };
    }

    if (!hasPermission(context.role, PERMISSIONS.STUDENT_LEAVE_APPROVE)) {
      return { success: false, error: `RBAC Violation: Privilege Escalation blocked. Role [${context.role}] cannot approve or reject leave tracks.` };
    }

    const targetRecord = this.leaveRegistry.get(requestId);
    if (!targetRecord) {
      return { success: false, error: `Lookup Error: Absences entry '${requestId}' not located inside active records.` };
    }

    if (targetRecord.tenantId !== context.tenantId) {
      return { success: false, error: 'Critical Security Alert: Tenant domain boundary mismatch! Resource access denied.' };
    }

    targetRecord.status = nextStatus;
    targetRecord.reviewedBy = context.userId;

    console.log(`  ✅ [Status Mutated] ${requestId} updated to ${nextStatus} by operator ${context.userId}`);
    return { success: true, data: targetRecord };
  }
}
