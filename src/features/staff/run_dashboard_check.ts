import { generateToken } from '../../shared/security';
import { StaffRegistryEngine } from './registry';
import { StaffDashboardEngine } from './dashboard';

async function verifyHRDashboard() {
  console.log('=== STARTING HR EXECUTIVE METRICS DASHBOARD VERIFICATION ===\n');
  const secretKey = 'super_secret_environment_variable_key';

  const registry = new StaffRegistryEngine(secretKey);
  const dashboard = new StaffDashboardEngine(secretKey, registry);

  const accraAdminToken = generateToken({ userId: 'usr_adm_01', tenantId: 'school_accra_01', role: 'SchoolAdmin' }, secretKey);
  const kumasiAdminToken = generateToken({ userId: 'usr_adm_02', tenantId: 'school_kumasi_02', role: 'SchoolAdmin' }, secretKey);

  console.log('--- SEEDING SYSTEM PERSONNEL RECORDS Across WORKSPACES ---');
  registry.registerStaff(`Bearer ${accraAdminToken}`, { fullName: 'Kofi Mensah', email: 'kofi@accra.edu', role: 'Teacher', primarySpecialty: 'Math', baseMonthlySalary: 3000 });
  registry.registerStaff(`Bearer ${accraAdminToken}`, { fullName: 'Ama Serwaa', email: 'ama@accra.edu', role: 'DepartmentHead', primarySpecialty: 'Science', baseMonthlySalary: 4500 });
  registry.registerStaff(`Bearer ${accraAdminToken}`, { fullName: 'Kwame Osei', email: 'kwame@accra.edu', role: 'Bursar', primarySpecialty: 'Finance', baseMonthlySalary: 3500 });

  registry.registerStaff(`Bearer ${kumasiAdminToken}`, { fullName: 'Yaa Asantewaa', email: 'yaa@kumasi.edu', role: 'Teacher', primarySpecialty: 'History', baseMonthlySalary: 3200 });

  console.log('\n--- EVALUATING ACCRA EXECUTIVE HR TELEMETRY ---');
  const accraSummary = dashboard.compileHRExecutiveMetrics(`Bearer ${accraAdminToken}`);
  console.log('Accra Metrics Result:\n', JSON.stringify(accraSummary, null, 2));

  console.log('\n--- EVALUATING KUMASI EXECUTIVE HR TELEMETRY ---');
  const kumasiSummary = dashboard.compileHRExecutiveMetrics(`Bearer ${kumasiAdminToken}`);
  console.log('Kumasi Metrics Result:\n', JSON.stringify(kumasiSummary, null, 2));

  console.log('\n=== HR EXECUTIVE METRICS DASHBOARD VERIFICATION COMPLETE ===');
}

verifyHRDashboard().catch(console.error);
