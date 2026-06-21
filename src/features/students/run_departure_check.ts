import { generateToken } from '../../shared/security';
import { HistoricalDepartureEngine } from './departure';

async function verifyDepartureEngine() {
  console.log('=== STARTING HISTORICAL DEPARTURE BOUNDARY VERIFICATION ===\n');
  const secretKey = 'super_secret_environment_variable_key';
  const engine = new HistoricalDepartureEngine(secretKey);

  const adminToken = generateToken({ userId: 'usr_admin_01', tenantId: 'school_accra_01', role: 'SchoolAdmin' }, secretKey);
  const teacherToken = generateToken({ userId: 'usr_teach_12', tenantId: 'school_accra_01', role: 'Teacher' }, secretKey);

  const targetStudentId = 'std_legacy_88';
  engine.seedRecord({
    id: targetStudentId,
    tenantId: 'school_accra_01',
    name: 'Kofi Mensah',
    status: 'ACTIVE',
    transcriptData: '{"Math": "B+", "English": "A"}',
    outstandingBalance: 1200.00
  });

  console.log('[Test Case 1] Teacher attempting to archive student profile...');
  const res1 = engine.archiveProfile(`Bearer ${teacherToken}`, targetStudentId, 'GRADUATED');
  console.log('Result Status:', res1, '\n------------------------------------\n');

  console.log('[Test Case 2] Authorized SchoolAdmin executing student GRADUATED transition...');
  const res2 = engine.archiveProfile(`Bearer ${adminToken}`, targetStudentId, 'GRADUATED');
  console.log('Result Status:', res2, '\n------------------------------------\n');

  console.log('[Test Case 3] Attempting grade modification on deactivated, frozen transcript...');
  const res3 = engine.modifyTranscript(`Bearer ${adminToken}`, targetStudentId, '{"Math": "A+", "English": "A+"}');
  console.log('Result Status:', res3, '\n------------------------------------\n');

  console.log('[Test Case 4] Processing outstanding payment on graduated student account ledger...');
  const res4 = engine.postLegacyPayment(`Bearer ${adminToken}`, targetStudentId, 500.00);
  console.log('Result Status:', res4);

  console.log('\n=== DEPARTURE BOUNDARY VERIFICATION COMPLETE ===');
}

verifyDepartureEngine().catch(console.error);
