import { authenticateRequest, RequestContext } from '../../shared/context';

export interface PeriodSlot {
  startTime: string;
  endTime: string;
}

export interface BreakSlot {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
}

export interface SubjectAssignment {
  id: string;
  subjectName: string;
  teacherName: string;
}

export interface SectionTimeMatrix {
  periodsCount: number;
  periods: PeriodSlot[];
  breaks: BreakSlot[];
  subjects: SubjectAssignment[];
}

export class TimetableFrameworkEngine {
  private masterTimetableRegistry: Map<string, Map<string, SectionTimeMatrix>> = new Map();

  constructor(private jwtSecret: string) {}

  public saveSectionMatrix(
    authHeader: string | undefined,
    sectionId: string,
    matrixPayload: SectionTimeMatrix
  ): { success: boolean; message?: string; error?: string } {
    let context: RequestContext;
    try {
      context = authenticateRequest(authHeader, this.jwtSecret);
    } catch (err: any) {
      return { success: false, error: `Security Intercept Failure: ${err.message}` };
    }

    if (context.role !== 'SchoolAdmin' && context.role !== 'SuperAdmin') {
      return { success: false, error: `RBAC Violation: Role [${context.role}] is unauthorized to adjust core schedule frameworks.` };
    }

    if (matrixPayload.periodsCount !== matrixPayload.periods.length) {
      return { success: false, error: 'Validation Error: Count metrics do not align with compiled period listings length.' };
    }

    if (!this.masterTimetableRegistry.has(context.tenantId)) {
      this.masterTimetableRegistry.set(context.tenantId, new Map());
    }

    const tenantPartition = this.masterTimetableRegistry.get(context.tenantId)!;
    tenantPartition.set(sectionId, matrixPayload);

    console.log(`  -> [Framework Engine] Saved Master Timetable for section [${sectionId}] under Tenant: ${context.tenantId} (${matrixPayload.periodsCount} Periods, ${matrixPayload.breaks.length} Breaks)`);
    return { success: true, message: `Successfully initialized ${sectionId} timetable framework configurations.` };
  }

  public getSectionMatrix(authHeader: string | undefined, sectionId: string): { success: boolean; data?: SectionTimeMatrix; error?: string } {
    let context: RequestContext;
    try {
      context = authenticateRequest(authHeader, this.jwtSecret);
    } catch (err: any) {
      return { success: false, error: `Security Intercept Failure: ${err.message}` };
    }

    const tenantPartition = this.masterTimetableRegistry.get(context.tenantId);
    if (!tenantPartition || !tenantPartition.has(sectionId)) {
      return { success: false, error: `Not Found: No configuration blueprint mapped for section '${sectionId}'.` };
    }

    return { success: true, data: tenantPartition.get(sectionId) };
  }
}
