import { generateToken } from '../../shared/security';
import { StaffRegistryEngine } from './registry';
import { StaffDepartmentEngine } from './departments';

async function verifyDepartmentsAndWorkloads() {
  console.log('=== STARTING DEPARTMENT WORKLOAD MANAGEMENT VERIFICATION ===\n');
  const secretKey = 'super_secret_environment_variable_key';

  const registry = new StaffRegistryEngine(secretKey);
  const deptEngine = new StaffDepartmentEngine(secretKey, registry);

  const accraAdminToken = generateToken({ userId: 'usr_adm_01', tenantId: 'school_accra_01', role: 'SchoolAdmin' }, secretKey);
  const kumasiAdminToken = generateToken({ userId: 'usr_adm_02', tenantId: 'school_kumasi_02', role: 'SchoolAdmin' }, secretKey);

  const staffSeed = registry.registerStaff(`Bearer ${accraAdminToken}`, {
    fullName: 'Kofi Mensah',
    email: 'kofi.mensah@accraschool.edu.gh',
    role: 'Teacher',
    primarySpecialty: 'Mathematics',
    baseMonthlySalary: 3500
  });
  const staffId = staffSeed.data!.id;

  console.log('\n--- SYSTEM DEPENDENCY PROFILES SEEDED COMPLETE ---\n');

  console.log('[Test Case 1] Constructing local Mathematics Department layout...');
  const res1 = deptEngine.createDepartment(`Bearer ${accraAdminToken}`, 'Mathematics and Analytics', 'MATH');
  console.log('Result Status:\n', JSON.stringify(res1, null, 2), '\n------------------------------------\n');

  console.log('[Test Case 2] Allocating base workload blocks (25 core hours/week)...');
  const res2 = deptEngine.assignInstructionalWorkload(`Bearer ${accraAdminToken}`, staffId, 25);
  console.log('Result Status:', res2, '\n------------------------------------\n');

  console.log('[Test Case 3] Kumasi Admin attempting to push additional hours to Accra staff profile...');
  const res3 = deptEngine.assignInstructionalWorkload(`Bearer ${kumasiAdminToken}`, staffId, 10);
  console.log('Result Status:', res3, '\n------------------------------------\n');

  console.log('[Test Case 4] Attempting to assign additional workload exceeding structural limits (+20 hours)...');
  const res4 = deptEngine.assignInstructionalWorkload(`Bearer ${accraAdminToken}`, staffId, 20);
  console.log('Result Status:', res4);

  console.log('\n=== DEPARTMENT WORKLOAD MANAGEMENT VERIFICATION COMPLETE ===');
}

verifyDepartmentsAndWorkloads().catch(console.error);
