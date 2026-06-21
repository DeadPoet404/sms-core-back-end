import { generateToken } from '../../shared/security';
import { AtomicEnrollmentEngine, EnrollmentPayload } from './enrollment';

async function runEnrollmentTest() {
  console.log('=== STARTING ATOMIC INGESTION ENGINE VERIFICATION ===\n');
  const secretKey = 'super_secret_environment_variable_key';
  const engine = new AtomicEnrollmentEngine(secretKey);

  const adminToken = generateToken({ userId: 'usr_admin_09', tenantId: 'school_accra_01', role: 'SchoolAdmin' }, secretKey);
  const studentToken = generateToken({ userId: 'usr_stud_12', tenantId: 'school_accra_01', role: 'Student' }, secretKey);

  const validPayload: EnrollmentPayload = {
    email: 'kwame.mensah@gmail.com',
    fullName: 'Kwame Mensah',
    guardianName: 'Ebenezer Mensah',
    guardianPhone: '+233244123456',
    feeTierId: 'tier_jhs_standard'
  };

  const corruptedPayload: EnrollmentPayload = {
    email: 'ama.serwaa@gmail.com',
    fullName: 'Ama Serwaa',
    guardianName: 'Abena Serwaa',
    guardianPhone: 'BAD_PHONE_FORMAT_ERROR',
    feeTierId: 'tier_scholarship_exempt'
  };

  console.log('[Test Case 1] Unauthorized role attempting student ingestion...');
  const res1 = await engine.enroll(`Bearer ${studentToken}`, validPayload);
  console.log('Result Status:', res1, '\n------------------------------------\n');

  console.log('[Test Case 2] Authorized SchoolAdmin passing a clean, complete payload...');
  const res2 = await engine.enroll(`Bearer ${adminToken}`, validPayload);
  console.log('Result Status:', res2, '\n------------------------------------\n');

  console.log('[Test Case 3] Authorized SchoolAdmin passing a corrupted phone payload (Verifying Inversion Engine)...');
  const res3 = await engine.enroll(`Bearer ${adminToken}`, corruptedPayload);
  console.log('Result Status:', res3);

  console.log('\n=== INGESTION ENGINE VERIFICATION COMPLETE ===');
}

runEnrollmentTest().catch(console.error);
