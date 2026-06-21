import { generateToken } from '../../shared/security';
import { FinanceCatalogEngine } from './catalog';
import { InvoiceGenerationEngine } from './invoice';
import { PaymentCollectionsEngine } from './collections';

async function verifyCollectionsLedger() {
  console.log('=== STARTING PAYMENT COLLECTIONS LEDGER VERIFICATION ===\n');
  const secretKey = 'super_secret_environment_variable_key';

  const catalogEngine = new FinanceCatalogEngine(secretKey);
  const invoiceEngine = new InvoiceGenerationEngine(secretKey, catalogEngine);
  const collectionsEngine = new PaymentCollectionsEngine(secretKey, invoiceEngine);

  const adminAccraToken = generateToken({ userId: 'usr_adm_01', tenantId: 'school_accra_01', role: 'SchoolAdmin' }, secretKey);
  const adminKumasiToken = generateToken({ userId: 'usr_adm_02', tenantId: 'school_kumasi_02', role: 'SchoolAdmin' }, secretKey);

  const seedTier = catalogEngine.createFeeTier(`Bearer ${adminAccraToken}`, 'Accra JHS Standard', 1000, 200, 50);
  const tierId = seedTier.data?.id ?? '';
  const studentId = 'std_kwame_77';
  
  catalogEngine.assignStudentToTier(`Bearer ${adminAccraToken}`, studentId, tierId);
  const generatedBill = invoiceEngine.generateStudentInvoice(`Bearer ${adminAccraToken}`, studentId);
  const targetInvoiceId = generatedBill.data?.id ?? '';
  
  console.log('\n--- FINANCIAL TRANSACTION BASELINE PREPARED ---\n');

  console.log('[Test Case 1] Kumasi Admin attempting to settle an Accra School invoice account...');
  const res1 = collectionsEngine.collectPayment(`Bearer ${adminKumasiToken}`, targetInvoiceId, 1250, 'MOMO-KUMASI-9941');
  console.log('Result Status:', res1, '\n------------------------------------\n');

  console.log('[Test Case 2] Processing a partial payment ($500 installment) via local Accra Admin...');
  const res2 = collectionsEngine.collectPayment(`Bearer ${adminAccraToken}`, targetInvoiceId, 500, 'MOMO-ACCRA-1102');
  console.log('Result Status:\n', JSON.stringify(res2, null, 2));
  
  console.log('Current Parent Invoice State:', invoiceEngine.getInvoice(targetInvoiceId), '\n------------------------------------\n');

  console.log('[Test Case 3] Submitting final balance remaining ($750) to fully close account ledger...');
  const res3 = collectionsEngine.collectPayment(`Bearer ${adminAccraToken}`, targetInvoiceId, 750, 'BANK-CHQ-4491');
  console.log('Result Status:\n', JSON.stringify(res3, null, 2));

  console.log('Final Parent Invoice State:', invoiceEngine.getInvoice(targetInvoiceId));
  console.log('\n=== PAYMENT COLLECTIONS LEDGER VERIFICATION COMPLETE ===');
}

verifyCollectionsLedger().catch(console.error);
