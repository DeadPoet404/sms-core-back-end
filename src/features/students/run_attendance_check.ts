import { generateToken } from '../../shared/security';
import { LeavePipelineEngine } from './leave';
import { AttendanceLedgerEngine } from './attendance';

class VerifiableLeaveEngine extends LeavePipelineEngine {
  private activeApprovedLeaves: Set<string> = new Set();

  public trackApproval(studentId: string) {
    this.activeApprovedLeaves.add(studentId);
  }

  public isStudentLeaveApproved(studentId: string): boolean {
    return this.activeApprovedLeaves.has(studentId);
  }
}

async function runAttendanceTest() {
  console.log('=== STARTING ATTENDANCE LEDGER LOGGING VERIFICATION ===\n');
  const secretKey = 'super_secret_environment_variable_key';

  const leaveEngine = new VerifiableLeaveEngine(secretKey);
  const studentWithLeave = 'std_kwame_01';
  const studentWithoutLeave = 'std_ama_02';
  
  leaveEngine.trackApproval(studentWithLeave);

  const attendanceEngine = new AttendanceLedgerEngine(secretKey, leaveEngine);

  const teacherToken = generateToken({ userId: 'usr_teach_44', tenantId: 'school_accra_01', role: 'Teacher' }, secretKey);
  const studentToken = generateToken({ userId: 'usr_stud_11', tenantId: 'school_accra_01', role: 'Student' }, secretKey);

  const classCohortSheet = [
    { studentId: studentWithLeave, status: 'ABSENT' as const },
    { studentId: studentWithoutLeave, status: 'ABSENT' as const }
  ];

  console.log('[Test Case 1] Student identity session trying to record cohort attendance...');
  const res1 = attendanceEngine.logBatchAttendance(`Bearer ${studentToken}`, 'class_jhs_2', '2026-06-21', classCohortSheet);
  console.log('Result Status:', res1, '\n------------------------------------\n');

  console.log('[Test Case 2] Authorized Teacher submitting batch attendance ledger sheet...');
  const res2 = attendanceEngine.logBatchAttendance(`Bearer ${teacherToken}`, 'class_jhs_2', '2026-06-21', classCohortSheet);
  console.log('Result Status:\n', JSON.stringify(res2, null, 2));

  console.log('\n=== ATTENDANCE LEDGER VERIFICATION COMPLETE ===');
}

runAttendanceTest().catch(console.error);
