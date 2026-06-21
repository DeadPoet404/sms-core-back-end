import { generateToken } from '../../shared/security';
import { FinanceCatalogEngine } from './catalog';
import { InvoiceGenerationEngine } from './invoice';

async function verifyInvoiceEngine() {
  console.log('=== STARTING BILLING INVOICE ENGINE VERIFICATION ===\n');
  const secretKey = 'super_secret_environment_variable_key';

  const catalogEngine = new FinanceCatalogEngine(secretKey);
  const invoiceEngine = new InvoiceGenerationEngine(secretKey, catalogEngine);

  const adminAccraToken = generateToken({ userId: 'usr_adm_01', tenantId: 'school_accra_01', role: 'SchoolAdmin' }, secretKey);
  const adminKumasiToken = generateToken({ userId: 'usr_adm_02', tenantId: 'school_kumasi_02', role: 'SchoolAdmin' }, secretKey);
  const guardianToken = generateToken({ userId: 'usr_guard_7', tenantId: 'school_accra_01', role: 'Guardian' }, secretKey);

  const seedTier = catalogEngine.createFeeTier(`Bearer ${adminAccraToken}`, 'Accra JHS Standard', 1000, 200, 50);
  const tierId = seedTier.data?.id ?? '';

  const targetStudentId = 'std_kwame_77';
  catalogEngine.assignStudentToTier(`Bearer ${adminAccraToken}`, targetStudentId, tierId);
  console.log('\n--- BASELINE DEPENDENCY SEEDING COMPLETE ---\n');

  console.log('[Test Case 1] Guardian attempting to invoke manual statement generation...');
  const res1 = invoiceEngine.generateStudentInvoice(`Bearer ${guardianToken}`, targetStudentId);
  console.log('Result Status:', res1, '\n------------------------------------\n');

  console.log('[Test Case 2] Kumasi Admin trying to generate invoices for an Accra student profile...');
  const res2 = invoiceEngine.generateStudentInvoice(`Bearer ${adminKumasiToken}`, targetStudentId);
  console.log('Result Status:', res2, '\n------------------------------------\n');

  console.log('[Test Case 3] Authorized Accra Admin generating invoice...');
  const res3 = invoiceEngine.generateStudentInvoice(`Bearer ${adminAccraToken}`, targetStudentId);
  console.log('Result Status:\n', JSON.stringify(res3, null, 2));

  console.log('\n=== BILLING INVOICE ENGINE VERIFICATION COMPLETE ===');
}

verifyInvoiceEngine().catch(console.error);
