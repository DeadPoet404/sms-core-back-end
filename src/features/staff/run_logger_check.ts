import { generateToken } from '../../shared/security';
import { StaffActivityLogger } from './logger';

async function verifyAuditLoggingEngine() {
  console.log('=== STARTING AUDIT LOGGER TENANT ISOLATION VERIFICATION ===\n');
  const secretKey = 'super_secret_environment_variable_key';

  const auditLogger = new StaffActivityLogger(secretKey);

  const accraAdminToken = generateToken({ userId: 'usr_adm_01', tenantId: 'school_accra_01', role: 'SchoolAdmin' }, secretKey);
  const kumasiAdminToken = generateToken({ userId: 'usr_adm_02', tenantId: 'school_kumasi_02', role: 'SchoolAdmin' }, secretKey);

  console.log('--- SIMULATING PLATFORM ACTION DISPATCHES Across TENANTS ---');
  auditLogger.logAction('school_accra_01', 'stf_emp_1', 'MODIFY_GRADE', 'STUDENT_KWAME_77');
  auditLogger.logAction('school_accra_01', 'stf_emp_1', 'APPROVE_LEAVE', 'STUDENT_AMA_12');
  auditLogger.logAction('school_kumasi_02', 'stf_emp_99', 'UPDATE_SALARY', 'STF_EMP_102');
  console.log('\n--- SIMULATION DISPATCH COMPLETE. RUNNING ISOLATION CONTROLS ---\n');

  console.log('[Test Case 1] Accra Admin gathering historical system audit footprints...');
  const accraOutput = auditLogger.getAuditTrail(`Bearer ${accraAdminToken}`);
  console.log(`Logs Gathered: ${accraOutput.logs?.length} records found.`);
  console.log('Records Data:\n', JSON.stringify(accraOutput, null, 2), '\n------------------------------------\n');

  console.log('[Test Case 2] Kumasi Admin gathering system audit logs...');
  const kumasiOutput = auditLogger.getAuditTrail(`Bearer ${kumasiAdminToken}`);
  console.log(`Logs Gathered: ${kumasiOutput.logs?.length} records found.`);
  console.log('Records Data:\n', JSON.stringify(kumasiOutput, null, 2));

  console.log('\n=== AUDIT LOGGER TENANT ISOLATION VERIFICATION COMPLETE ===');
}

verifyAuditLoggingEngine().catch(console.error);
