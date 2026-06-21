import { generateToken } from '../../shared/security';
import { FinanceCatalogEngine } from './catalog';

async function verifyFinanceCatalog() {
  console.log('=== STARTING TUITION CATALOG ENGINE VERIFICATION ===\n');
  const secretKey = 'super_secret_environment_variable_key';
  const engine = new FinanceCatalogEngine(secretKey);

  const adminAccraToken = generateToken({ userId: 'usr_adm_01', tenantId: 'school_accra_01', role: 'SchoolAdmin' }, secretKey);
  const adminKumasiToken = generateToken({ userId: 'usr_adm_02', tenantId: 'school_kumasi_02', role: 'SchoolAdmin' }, secretKey);
  const guardianToken = generateToken({ userId: 'usr_guard_7', tenantId: 'school_accra_01', role: 'Guardian' }, secretKey);

  console.log('[Test Case 1] Guardian trying to create a premium school tier layout...');
  const res1 = engine.createFeeTier(`Bearer ${guardianToken}`, 'Primary Premium Tier', 1500, 300, 150);
  console.log('Result Status:', res1, '\n------------------------------------\n');

  console.log('[Test Case 2] Accra Admin configuring standard JHS pricing structure...');
  const res2 = engine.createFeeTier(`Bearer ${adminAccraToken}`, 'Accra JHS Standard', 1000, 200, 50);
  const accraTierId = res2.data?.id ?? 'none';
  console.log('Result Status:', res2, '\n------------------------------------\n');

  console.log('[Test Case 3] Kumasi Admin trying to bind an Accra student to an external catalog entry...');
  const res3 = engine.assignStudentToTier(`Bearer ${adminKumasiToken}`, 'std_kwame_77', accraTierId);
  console.log('Result Status:', res3, '\n------------------------------------\n');

  console.log('[Test Case 4] Accra Admin assigning student to local tier configuration...');
  const res4 = engine.assignStudentToTier(`Bearer ${adminAccraToken}`, 'std_kwame_77', accraTierId);
  console.log('Result Status:', res4, '\n------------------------------------\n');

  console.log('[Summary Breakdown] Parsing active runtime calculation values:');
  const breakdown = engine.getStudentBillingBreakdown('std_kwame_77');
  console.log(breakdown ? `  Calculated Total Check: $${breakdown.totalBreakdown} (Base: $${breakdown.baseTuition})` : '  Error: No breakdown located.');

  console.log('\n=== TUITION CATALOG VERIFICATION COMPLETE ===');
}

verifyFinanceCatalog().catch(console.error);
