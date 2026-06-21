import { authenticateRequest, RequestContext } from '../../shared/context';
import { StaffRecord } from './registry';

export interface HRMetricsSummary {
  tenantId: string;
  totalHeadcount: number;
  totalMonthlyPayrollLiability: number;
  roleDistribution: {
    teachers: number;
    departmentHeads: number;
    bursars: number;
    librarians: number;
  };
}

export class StaffDashboardEngine {
  constructor(private jwtSecret: string, private registryEngine: any) {}

  public compileHRExecutiveMetrics(authHeader: string | undefined): { success: boolean; metrics?: HRMetricsSummary; error?: string } {
    let context: RequestContext;
    try {
      context = authenticateRequest(authHeader, this.jwtSecret);
    } catch (err: any) {
      return { success: false, error: `Security Intercept Failure: ${err.message}` };
    }

    if (context.role !== 'SchoolAdmin' && context.role !== 'SuperAdmin') {
      return { success: false, error: `RBAC Violation: Role [${context.role}] is unauthorized to access HR analytics.` };
    }

    let totalMonthlyPayrollLiability = 0;
    let teachers = 0;
    let departmentHeads = 0;
    let bursars = 0;
    let librarians = 0;

    const allStaff: StaffRecord[] = this.registryEngine.getAllStaffForReporting();
    const tenantStaff = allStaff.filter(staff => staff.tenantId === context.tenantId && staff.status === 'ACTIVE');

    for (const employee of tenantStaff) {
      totalMonthlyPayrollLiability += employee.baseMonthlySalary;

      if (employee.role === 'Teacher') teachers++;
      if (employee.role === 'DepartmentHead') departmentHeads++;
      if (employee.role === 'Bursar') bursars++;
      if (employee.role === 'Librarian') librarians++;
    }

    return {
      success: true,
      metrics: {
        tenantId: context.tenantId,
        totalHeadcount: tenantStaff.length,
        totalMonthlyPayrollLiability,
        roleDistribution: {
          teachers,
          departmentHeads,
          bursars,
          librarians
        }
      }
    };
  }
}
