import { generateToken } from '../../shared/security';
import { TimetableFrameworkEngine, SectionTimeMatrix } from './timetable';

async function verifySynchronizedFramework() {
  console.log('=== STARTING SYNCHRONIZED TIMETABLE FRAMEWORK VERIFICATION ===\n');
  const secretKey = 'super_secret_environment_variable_key';
  const engine = new TimetableFrameworkEngine(secretKey);

  const accraAdminToken = generateToken({ userId: 'usr_adm_01', tenantId: 'school_accra_01', role: 'SchoolAdmin' }, secretKey);
  const kumasiAdminToken = generateToken({ userId: 'usr_adm_02', tenantId: 'school_kumasi_02', role: 'SchoolAdmin' }, secretKey);

  const mockFrontendGrade1Payload: SectionTimeMatrix = {
    periodsCount: 2,
    periods: [
      { startTime: "08:00 AM", endTime: "09:00 AM" },
      { startTime: "09:00 AM", endTime: "10:00 AM" }
    ],
    breaks: [
      { id: "g1-b1", name: "First Break", startTime: "10:00 AM", endTime: "10:20 AM" }
    ],
    subjects: [
      { id: "g1-s1", subjectName: "Mathematics", teacherName: "Mr. Emmanuel Mensah" }
    ]
  };

  console.log('[Test Case 1] Accra Admin submitting Grade 1 UI setup configuration state matrix...');
  const res1 = engine.saveSectionMatrix(`Bearer ${accraAdminToken}`, 'grade-1', mockFrontendGrade1Payload);
  console.log('Result Status:\n', JSON.stringify(res1, null, 2), '\n------------------------------------\n');

  console.log('[Test Case 2] Kumasi Admin attempting to pull Accra School Grade 1 schedule configuration schema...');
  const res2 = engine.getSectionMatrix(`Bearer ${kumasiAdminToken}`, 'grade-1');
  console.log('Result Status (Should Fail):', res2, '\n------------------------------------\n');

  console.log('[Test Case 3] Accra Admin reading back verified persistent configuration parameters...');
  const res3 = engine.getSectionMatrix(`Bearer ${accraAdminToken}`, 'grade-1');
  console.log('Result Status Data Output:\n', JSON.stringify(res3.data, null, 2));

  console.log('\n=== SYNCHRONIZED TIMETABLE FRAMEWORK VERIFICATION COMPLETE ===');
}

verifySynchronizedFramework().catch(console.error);
