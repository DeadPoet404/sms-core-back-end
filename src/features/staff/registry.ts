import { authenticateRequest, RequestContext } from '../../shared/context';

export type StaffRole = 'Teacher' | 'DepartmentHead' | 'Bursar' | 'Librarian';
export type StaffStatus = 'ACTIVE' | 'ON_LEAVE' | 'TERMINATED';

export interface StaffRecord {
  id: string;
  tenantId: string;
  fullName: string;
  email: string;
  role: StaffRole;
  status: StaffStatus;
  primarySpecialty: string;
  baseMonthlySalary: number;
  joinedAt: string;
}

export class StaffRegistryEngine {
  private staffDb: Map<string, StaffRecord> = new Map();
  private incrementId = 1;

  constructor(private jwtSecret: string) {}

  public registerStaff(
    authHeader: string | undefined,
    input: {
      fullName: string;
      email: string;
      role: StaffRole;
      primarySpecialty: string;
      baseMonthlySalary: number;
    }
  ): { success: boolean; data?: StaffRecord; error?: string } {
    let context: RequestContext;
    try {
      context = authenticateRequest(authHeader, this.jwtSecret);
    } catch (err: any) {
      return { success: false, error: `Security Intercept Failure: ${err.message}` };
    }

    if (context.role !== 'SchoolAdmin' && context.role !== 'SuperAdmin') {
      return { success: false, error: `RBAC Violation: Role [${context.role}] is unauthorized to alter staff registries.` };
    }

    if (!input.fullName.trim() || !input.email.includes('@')) {
      return { success: false, error: 'Validation Error: Invalid naming conventions or email string pattern.' };
    }

    if (input.baseMonthlySalary <= 0) {
      return { success: false, error: 'Validation Error: Base monthly compensation must be greater than 0.' };
    }

    const isDuplicate = Array.from(this.staffDb.values()).some(
      staff => staff.tenantId === context.tenantId && staff.email.toLowerCase() === input.email.toLowerCase()
    );
    if (isDuplicate) {
      return { success: false, error: `Conflict Error: Staff record with email '${input.email}' already exists inside this tenant.` };
    }

    const staffId = `stf_emp_${this.incrementId++}`;
    const newStaff: StaffRecord = {
      id: staffId,
      tenantId: context.tenantId,
      fullName: input.fullName,
      email: input.email.toLowerCase(),
      role: input.role,
      status: 'ACTIVE',
      primarySpecialty: input.primarySpecialty,
      baseMonthlySalary: input.baseMonthlySalary,
      joinedAt: new Date().toISOString().split('T')[0]
    };

    this.staffDb.set(staffId, newStaff);
    console.log(`  -> [HR Ingestion] Successfully registered '${newStaff.fullName}' as a ${newStaff.role} (ID: ${staffId})`);
    
    return { success: true, data: newStaff };
  }

  public getStaffMember(authHeader: string | undefined, staffId: string): { success: boolean; data?: StaffRecord; error?: string } {
    let context: RequestContext;
    try {
      context = authenticateRequest(authHeader, this.jwtSecret);
    } catch (err: any) {
      return { success: false, error: `Security Intercept Failure: ${err.message}` };
    }

    const record = this.staffDb.get(staffId);
    if (!record) {
      return { success: false, error: `Not Found: Staff member '${staffId}' does not exist.` };
    }

    if (record.tenantId !== context.tenantId && context.role !== 'SuperAdmin') {
      return { success: false, error: 'Critical Security Alert: Access denied. Cross-tenant profile harvesting intercepted.' };
    }

    return { success: true, data: record };
  }

  public getAllStaffForReporting(): StaffRecord[] {
    return Array.from(this.staffDb.values());
  }
}
