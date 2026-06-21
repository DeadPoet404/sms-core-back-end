import { hasPermission, PERMISSIONS } from './rbac';

function testRbacMatrix() {
  console.log('=== STARTING ROLE-BASED ACCESS CONTROL MATRIX VERIFICATION ===\n');

  interface TestCase {
    role: string;
    permission: any;
    expected: boolean;
    description: string;
  }

  const cases: TestCase[] = [
    {
      role: 'Accountant',
      permission: PERMISSIONS.BILLING_GENERATE,
      expected: true,
      description: 'Accountant generating billing batches.'
    },
    {
      role: 'Accountant',
      permission: PERMISSIONS.ATTENDANCE_WRITE,
      expected: false,
      description: 'Accountant trying to log classroom student attendance (Cross-Domain Block).'
    },
    {
      role: 'Teacher',
      permission: PERMISSIONS.ATTENDANCE_WRITE,
      expected: true,
      description: 'Teacher writing daily cohort attendance ledger records.'
    },
    {
      role: 'Teacher',
      permission: PERMISSIONS.PAYROLL_AUTHORIZE,
      expected: false,
      description: 'Teacher trying to authorize staff salary releases (Privilege Escalation Block).'
    },
    {
      role: 'SchoolAdmin',
      permission: PERMISSIONS.STAFF_MANAGE,
      expected: true,
      description: 'School Admin managing active staff employment profiles.'
    },
    {
      role: 'IntruderFakeRole',
      permission: PERMISSIONS.ATTENDANCE_READ,
      expected: false,
      description: 'Unrecognized system role passing through validation framework (Fail-Closed Block).'
    }
  ];

  let failedTests = 0;

  cases.forEach((tc, idx) => {
    const result = hasPermission(tc.role, tc.permission);
    const passed = result === tc.expected;
    if (!passed) failedTests++;
    console.log(`[Case ${idx + 1}] ${tc.description}`);
    console.log(`  - Role: ${tc.role}`);
    console.log(`  - Evaluation result: ${result} (Expected: ${tc.expected}) -> ${passed ? '✅ PASSED' : '❌ FAILED'}\n`);
  });

  console.log(`=== RUN COMPLETED. FAILURES: ${failedTests} ===`);
}

testRbacMatrix();
