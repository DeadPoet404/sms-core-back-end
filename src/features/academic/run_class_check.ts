import { generateToken } from '../../shared/security';
import { StaffRegistryEngine } from '../staff/registry';
import { AcademicClassEngine } from './classes';

async function verifyAcademicSecurity() {
  console.log('=== STARTING ACADEMIC SECURITY GUARDRAIL VERIFICATION ===\n');
  const secretKey = 'super_secret_environment_variable_key';
  
  const registry = new StaffRegistryEngine(secretKey);
  const academic = new AcademicClassEngine(secretKey, registry);

  const accraToken = generateToken({ userId: 'adm_a', tenantId: 'school_accra_01', role: 'SchoolAdmin' }, secretKey);
  const kumasiToken = generateToken({ userId: 'adm_k', tenantId: 'school_kumasi_02', role: 'SchoolAdmin' }, secretKey);

  // Register teacher in Accra
  registry.registerStaff(`Bearer ${accraToken}`, { fullName: 'Kofi', email: 'k@a.com', role: 'Teacher', primarySpecialty: 'Math', baseMonthlySalary: 1000 });
  const kofiId = 'stf_emp_1';

  console.log('[Test 1] Attempting valid Accra teacher assignment...');
  const res1 = academic.createClass(`Bearer ${accraToken}`, 'Math 101', kofiId);
  console.log('Result:', res1.success ? 'SUCCESS' : 'FAILED', res1.error || '');

  console.log('[Test 2] Attempting to hijack Accra teacher for Kumasi school...');
  const res2 = academic.createClass(`Bearer ${kumasiToken}`, 'Math 101', kofiId);
  console.log('Result:', res2.success ? 'SUCCESS' : 'FAILED', res2.error || '');

  console.log('\n=== ACADEMIC SECURITY VERIFICATION COMPLETE ===');
}

verifyAcademicSecurity().catch(console.error);
