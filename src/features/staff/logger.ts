import { authenticateRequest, RequestContext } from '../../shared/context';

export interface AuditLogEntry {
  id: string;
  tenantId: string;
  staffId: string;
  action: string;
  resourceTarget: string;
  timestamp: string;
}

export class StaffActivityLogger {
  private logRegistry: AuditLogEntry[] = [];
  private incrementId = 1;

  constructor(private jwtSecret: string) {}

  public logAction(
    tenantId: string,
    staffId: string,
    action: string,
    resourceTarget: string
  ): void {
    const entry: AuditLogEntry = {
      id: `log_audit_${this.incrementId++}`,
      tenantId,
      staffId,
      action,
      resourceTarget,
      timestamp: new Date().toISOString()
    };
    this.logRegistry.push(entry);
    console.log(`  -> [Audit Trail Saved] Tenant: ${tenantId} | User: ${staffId} -> Action: ${action} on ${resourceTarget}`);
  }

  public getAuditTrail(authHeader: string | undefined): { success: boolean; logs?: AuditLogEntry[]; error?: string } {
    let context: RequestContext;
    try {
      context = authenticateRequest(authHeader, this.jwtSecret);
    } catch (err: any) {
      return { success: false, error: `Security Intercept Failure: ${err.message}` };
    }

    if (context.role !== 'SchoolAdmin' && context.role !== 'SuperAdmin') {
      return { success: false, error: `RBAC Violation: Role [${context.role}] lacks clearance to analyze audit vectors.` };
    }

    const matchingLogs = this.logRegistry.filter(log => log.tenantId === context.tenantId);

    return {
      success: true,
      logs: matchingLogs
    };
  }
}
