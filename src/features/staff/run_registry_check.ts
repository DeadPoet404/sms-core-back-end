import { generateToken } from '../../shared/security';
import { StaffRegistryEngine } from './registry';

async function verifyStaffRegistry() {
  console.log('=== STARTING STAFF REGISTRY INGESTION PIPELINE VERIFICATION ===\n');
  const secretKey = 'super_secret_environment_variable_key';

  const registry = new StaffRegistryEngine(secretKey);

  const accraAdminToken = generateToken({ userId: 'usr_adm_01', tenantId: 'school_accra_01', role: 'SchoolAdmin' }, secretKey);
  const kumasiAdminToken = generateToken({ userId: 'usr_adm_02', tenantId: 'school_kumasi_02', role: 'SchoolAdmin' }, secretKey);
  const rogueTeacherToken = generateToken({ userId: 'usr_tch_44', tenantId: 'school_accra_01', role: 'Teacher' }, secretKey);

  console.log('[Test Case 1] Onboarding a senior Mathematics educator at Accra School...');
  const res1 = registry.registerStaff(`Bearer ${accraAdminToken}`, {
    fullName: 'Kofi Mensah',
    email: 'kofi.mensah@accraschool.edu.gh',
    role: 'Teacher',
    primarySpecialty: 'Advanced Mathematics',
    baseMonthlySalary: 3500
  });
  console.log('Result Status:\n', JSON.stringify(res1, null, 2), '\n------------------------------------\n');
  const targetStaffId = res1.data!.id;

  console.log('[Test Case 2] Standard teacher attempting to invoke HR ingestion parameters...');
  const res2 = registry.registerStaff(`Bearer ${rogueTeacherToken}`, {
    fullName: 'Imposter Profile',
    email: 'hacker@leak.com',
    role: 'Bursar',
    primarySpecialty: 'Malicious Infiltration',
    baseMonthlySalary: 9999
  });
  console.log('Result Status:', res2, '\n------------------------------------\n');

  console.log('[Test Case 3] Kumasi Admin attempting to harvest Kofi Mensah\'s registry profile data from Accra School...');
  const res3 = registry.getStaffMember(`Bearer ${kumasiAdminToken}`, targetStaffId);
  console.log('Result Status:', res3, '\n------------------------------------\n');

  console.log('[Test Case 4] Admin submitting a contract registration with a negative base salary...');
  const res4 = registry.registerStaff(`Bearer ${accraAdminToken}`, {
    fullName: 'Error Prone Profile',
    email: 'bad.data@accraschool.edu.gh',
    role: 'Librarian',
    primarySpecialty: 'Archiving',
    baseMonthlySalary: -500
  });
  console.log('Result Status:', res4);

  console.log('\n=== STAFF REGISTRY INGESTION PIPELINE VERIFICATION COMPLETE ===');
}

verifyStaffRegistry().catch(console.error);
