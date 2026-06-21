import { generateToken } from '../../shared/security';
import { LeavePipelineEngine } from './leave';

async function runLeavePipelineTest() {
  console.log('=== STARTING LEAVE PIPELINE ENGINE VERIFICATION ===\n');
  const secretKey = 'super_secret_environment_variable_key';
  const pipeline = new LeavePipelineEngine(secretKey);

  const studentToken = generateToken({ userId: 'usr_stud_99', tenantId: 'school_accra_01', role: 'Student' }, secretKey);
  const adminToken = generateToken({ userId: 'usr_admin_01', tenantId: 'school_accra_01', role: 'SchoolAdmin' }, secretKey);
  const attackerToken = generateToken({ userId: 'usr_malicious_admin', tenantId: 'school_kumasi_02', role: 'SchoolAdmin' }, secretKey);

  console.log('[Test Case 1] Student submitting a request without secure proof...');
  const failSubmit = pipeline.submitRequest(`Bearer ${studentToken}`, 'usr_stud_99', 'Medical leave for recovery', 'http://unsecure-http-link.com');
  console.log('Result Status:', failSubmit, '\n------------------------------------\n');

  console.log('[Test Case 2] Student submitting request with clear HTTPS documentation proof...');
  const cleanSubmit = pipeline.submitRequest(`Bearer ${studentToken}`, 'usr_stud_99', 'Medical leave for dental tracking', 'https://cdn.sms.com/proofs/med_99.pdf');
  const createdId = cleanSubmit.data?.id ?? 'none';
  console.log('Result Status:', cleanSubmit, '\n------------------------------------\n');

  console.log('[Test Case 3] Student attempting to self-approve their own request context entry...');
  const exploitAttempt = pipeline.evaluateRequest(`Bearer ${studentToken}`, createdId, 'APPROVED');
  console.log('Result Status:', exploitAttempt, '\n------------------------------------\n');

  console.log('[Test Case 4] External Admin from "school_kumasi_02" attempting to evaluate "school_accra_01" record...');
  const crossTenantAttempt = pipeline.evaluateRequest(`Bearer ${attackerToken}`, createdId, 'APPROVED');
  console.log('Result Status:', crossTenantAttempt, '\n------------------------------------\n');

  console.log('[Test Case 5] Authorized SchoolAdmin reviewing and approving request entry...');
  const cleanReview = pipeline.evaluateRequest(`Bearer ${adminToken}`, createdId, 'APPROVED');
  console.log('Result Status:', cleanReview);

  console.log('\n=== LEAVE PIPELINE ENGINE VERIFICATION COMPLETE ===');
}

runLeavePipelineTest().catch(console.error);
