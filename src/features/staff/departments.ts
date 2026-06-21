import { authenticateRequest, RequestContext } from '../../shared/context';
import { StaffRegistryEngine } from './registry';

export interface DepartmentRecord {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  headOfDepartmentId?: string;
}

export interface WorkloadAssignment {
  staffId: string;
  assignedHours: number;
}

export class StaffDepartmentEngine {
  private departmentsDb: Map<string, DepartmentRecord> = new Map();
  private workloadsDb: Map<string, number> = new Map();
  private incrementId = 1;

  constructor(private jwtSecret: string, private registryEngine: StaffRegistryEngine) {}

  public createDepartment(
    authHeader: string | undefined,
    name: string,
    code: string
  ): { success: boolean; data?: DepartmentRecord; error?: string } {
    let context: RequestContext;
    try {
      context = authenticateRequest(authHeader, this.jwtSecret);
    } catch (err: any) {
      return { success: false, error: `Security Intercept Failure: ${err.message}` };
    }

    if (context.role !== 'SchoolAdmin' && context.role !== 'SuperAdmin') {
      return { success: false, error: 'RBAC Violation: Non-administrative personnel cannot create structural departments.' };
    }

    const deptId = `dpt_struct_${this.incrementId++}`;
    const newDept: DepartmentRecord = {
      id: deptId,
      tenantId: context.tenantId,
      name,
      code: code.toUpperCase().trim()
    };

    this.departmentsDb.set(deptId, newDept);
    console.log(`  -> [Structural Layer] Created department ${newDept.code} (${newDept.name}) for tenant ${context.tenantId}`);
    return { success: true, data: newDept };
  }

  public assignInstructionalWorkload(
    authHeader: string | undefined,
    staffId: string,
    additionalHours: number
  ): { success: boolean; cumulativeHours?: number; error?: string } {
    let context: RequestContext;
    try {
      context = authenticateRequest(authHeader, this.jwtSecret);
    } catch (err: any) {
      return { success: false, error: `Security Intercept Failure: ${err.message}` };
    }

    if (context.role !== 'SchoolAdmin' && context.role !== 'SuperAdmin') {
      return { success: false, error: 'RBAC Violation: Unauthorized to adjust operational staff workload metrics.' };
    }

    const staffLookup = this.registryEngine.getStaffMember(authHeader, staffId);
    if (!staffLookup.success || !staffLookup.data) {
      return { success: false, error: `Workload Allocation Denied: ${staffLookup.error}` };
    }

    const currentLoad = this.workloadsDb.get(staffId) || 0;
    const projectLoad = currentLoad + additionalHours;

    if (projectLoad > 40) {
      return { 
        success: false, 
        error: `Labor Compliance Guardrail: Allocation rejected. Assignment pushes staff member '${staffId}' to ${projectLoad} hours/week (Max Cap: 40).` 
      };
    }

    this.workloadsDb.set(staffId, projectLoad);
    console.log(`  -> [Workload Logged] Assigned +${additionalHours} hrs to employee ${staffId}. Rolling Weekly Total: ${projectLoad}/40 hrs.`);
    
    return { success: true, cumulativeHours: projectLoad };
  }

  public getStaffLoad(staffId: string): number {
    return this.workloadsDb.get(staffId) || 0;
  }
}
