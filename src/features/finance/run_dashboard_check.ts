import { generateToken } from '../../shared/security';
import { FinanceCatalogEngine } from './catalog';
import { InvoiceGenerationEngine } from './invoice';
import { PaymentCollectionsEngine } from './collections';
import { FinanceDashboardEngine } from './dashboard';

async function verifyDashboardAnalytics() {
  console.log('=== STARTING FINANCE METRICS DASHBOARD VERIFICATION ===\n');
  const secretKey = 'super_secret_environment_variable_key';

  const catalog = new FinanceCatalogEngine(secretKey);
  const invoiceEngine = new InvoiceGenerationEngine(secretKey, catalog);
  const collections = new PaymentCollectionsEngine(secretKey, invoiceEngine);
  const dashboard = new FinanceDashboardEngine(secretKey, invoiceEngine);

  const adminAccraToken = generateToken({ userId: 'usr_adm_01', tenantId: 'school_accra_01', role: 'SchoolAdmin' }, secretKey);

  const standardTier = catalog.createFeeTier(`Bearer ${adminAccraToken}`, 'Standard JHS', 1000, 200, 50);
  const premiumTier = catalog.createFeeTier(`Bearer ${adminAccraToken}`, 'Premium JHS', 2000, 300, 100);

  catalog.assignStudentToTier(`Bearer ${adminAccraToken}`, 'student_01_paid', standardTier.data!.id);
  catalog.assignStudentToTier(`Bearer ${adminAccraToken}`, 'student_02_partial', standardTier.data!.id);
  catalog.assignStudentToTier(`Bearer ${adminAccraToken}`, 'student_03_unpaid', premiumTier.data!.id);

  const bill1 = invoiceEngine.generateStudentInvoice(`Bearer ${adminAccraToken}`, 'student_01_paid');
  const bill2 = invoiceEngine.generateStudentInvoice(`Bearer ${adminAccraToken}`, 'student_02_partial');
  const bill3 = invoiceEngine.generateStudentInvoice(`Bearer ${adminAccraToken}`, 'student_03_unpaid');

  console.log('\n--- SIMULATING INCOMING TRANSACTION LEAN CONVERSIONS ---');
  collections.collectPayment(`Bearer ${adminAccraToken}`, bill1.data!.id, 1250, 'MOMO-ACC-998');
  collections.collectPayment(`Bearer ${adminAccraToken}`, bill2.data!.id, 450, 'MOMO-ACC-441');

  console.log('\n--- EVALUATING DASHBOARD ANALYTICS LIVE AGGREGATION ---');
  const result = dashboard.compileExecutiveMetrics(`Bearer ${adminAccraToken}`);
  console.log('Result Metrics Summary:\n', JSON.stringify(result, null, 2));

  console.log('\n=== FINANCE METRICS DASHBOARD VERIFICATION COMPLETE ===');
}

verifyDashboardAnalytics().catch(console.error);
