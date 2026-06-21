import { authenticateRequest, RequestContext } from '../../shared/context';
import { hasPermission, PERMISSIONS } from '../../shared/rbac';

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'EXCUSED';

export interface AttendanceEntry {
  studentId: string;
  status: AttendanceStatus;
}

export interface AttendanceRecord {
  id: string;
  tenantId: string;
  date: string;
  cohortId: string;
  records: AttendanceEntry[];
  loggedBy: string;
}

export interface LeaveLookup {
  isStudentLeaveApproved(studentId: string): boolean;
}

export class AttendanceLedgerEngine {
  private attendanceDb: Map<string, AttendanceRecord> = new Map();
  private incrementId = 1;

  constructor(private jwtSecret: string, private leaveEngine: LeaveLookup) {}

  public logBatchAttendance(
    authHeader: string | undefined,
    cohortId: string,
    date: string,
    rawEntries: { studentId: string; status: 'PRESENT' | 'ABSENT' }[]
  ): { success: boolean; data?: AttendanceRecord; error?: string } {
    let context: RequestContext;
    try {
      context = authenticateRequest(authHeader, this.jwtSecret);
    } catch (err: any) {
      return { success: false, error: `Security Intercept Failure: ${err.message}` };
    }

    if (!hasPermission(context.role, PERMISSIONS.ATTENDANCE_WRITE)) {
      return { success: false, error: `RBAC Violation: Role [${context.role}] is unauthorized to write attendance logs.` };
    }

    console.log(`[Attendance Ingestion] Processing cohort ${cohortId} for date ${date}...`);
    
    const processedRecords: AttendanceEntry[] = rawEntries.map((entry) => {
      let finalStatus: AttendanceStatus = entry.status;

      if (entry.status === 'ABSENT') {
        const hasApprovedLeave = this.leaveEngine.isStudentLeaveApproved(entry.studentId);
        if (hasApprovedLeave) {
          console.log(`  -> [Auto-Override Protection] Student ${entry.studentId} is ABSENT but has an APPROVED leave registry record. Flipping status to EXCUSED.`);
          finalStatus = 'EXCUSED';
        }
      }

      return {
        studentId: entry.studentId,
        status: finalStatus
      };
    });

    const newRecord: AttendanceRecord = {
      id: `att_sheet_${this.incrementId++}`,
      tenantId: context.tenantId,
      date,
      cohortId,
      records: processedRecords,
      loggedBy: context.userId
    };

    this.attendanceDb.set(newRecord.id, newRecord);
    return { success: true, data: newRecord };
  }
}
