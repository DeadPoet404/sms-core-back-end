import { authenticateRequest, RequestContext } from '../../shared/context';
import { StaffRegistryEngine } from '../staff/registry';

export interface AcademicClass {
  id: string;
  tenantId: string;
  courseName: string;
  teacherId: string;
  enrolledStudents: string[];
}

export class AcademicClassEngine {
  private classDb: Map<string, AcademicClass> = new Map();
  private incrementId = 1;

  constructor(private jwtSecret: string, private staffRegistry: StaffRegistryEngine) {}

  public createClass(
    authHeader: string | undefined,
    courseName: string,
    teacherId: string
  ): { success: boolean; data?: AcademicClass; error?: string } {
    let context: RequestContext;
    try {
      context = authenticateRequest(authHeader, this.jwtSecret);
    } catch (err: any) {
      return { success: false, error: `Security Failure: ${err.message}` };
    }

    // MANDATORY SECURITY GATE: Verify Teacher exists and is in the correct Tenant
    const staffLookup = this.staffRegistry.getStaffMember(authHeader, teacherId);
    if (!staffLookup.success) {
      return { success: false, error: `Academic Integrity Violation: ${staffLookup.error}` };
    }

    const classId = `class_acc_${this.incrementId++}`;
    const newClass: AcademicClass = {
      id: classId,
      tenantId: context.tenantId,
      courseName,
      teacherId,
      enrolledStudents: []
    };

    this.classDb.set(classId, newClass);
    console.log(`  -> [Academic Engine] Securely created class '${courseName}' with validated teacher ${teacherId}`);
    return { success: true, data: newClass };
  }
}