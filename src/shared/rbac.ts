export const PERMISSIONS = {
  SYSTEM_PROVISION: 'system:provision',
  STUDENT_ENROLL: 'student:enroll',
  STUDENT_LEAVE_WRITE: 'student:leave:write',
  STUDENT_LEAVE_APPROVE: 'student:leave:approve',
  STUDENT_DEPARTURE_WRITE: 'student:departure:write',
  ATTENDANCE_WRITE: 'attendance:write',
  ATTENDANCE_READ: 'attendance:read',
  BILLING_GENERATE: 'billing:generate',
  PAYMENT_RECORD: 'payment:record',
  EXPENSE_LOG: 'expense:log',
  PAYROLL_AUTHORIZE: 'payroll:authorize',
  FINANCE_READ: 'finance:read',
  COHORT_MANAGE: 'cohort:manage',
  TIMETABLE_WRITE: 'timetable:write',
  COURSE_MANAGE: 'course:manage',
  STAFF_MANAGE: 'staff:manage',
  WORKLOAD_ALLOCATE: 'workload:allocate'
} as const;

export type SystemPermission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

const ROLES_HIERARCHY: Record<string, SystemPermission[]> = {
  SuperAdmin: [PERMISSIONS.SYSTEM_PROVISION, PERMISSIONS.FINANCE_READ],
  SchoolAdmin: [
    PERMISSIONS.STUDENT_ENROLL,
    PERMISSIONS.STUDENT_LEAVE_APPROVE,
    PERMISSIONS.STUDENT_DEPARTURE_WRITE,
    PERMISSIONS.ATTENDANCE_READ,
    PERMISSIONS.FINANCE_READ,
    PERMISSIONS.COHORT_MANAGE,
    PERMISSIONS.TIMETABLE_WRITE,
    PERMISSIONS.COURSE_MANAGE,
    PERMISSIONS.STAFF_MANAGE,
    PERMISSIONS.WORKLOAD_ALLOCATE
  ],
  Accountant: [
    PERMISSIONS.FINANCE_READ,
    PERMISSIONS.BILLING_GENERATE,
    PERMISSIONS.PAYMENT_RECORD,
    PERMISSIONS.EXPENSE_LOG,
    PERMISSIONS.PAYROLL_AUTHORIZE
  ],
  Teacher: [
    PERMISSIONS.ATTENDANCE_WRITE,
    PERMISSIONS.ATTENDANCE_READ,
    PERMISSIONS.STUDENT_LEAVE_WRITE,
    PERMISSIONS.TIMETABLE_WRITE
  ],
  Student: [PERMISSIONS.ATTENDANCE_READ, PERMISSIONS.STUDENT_LEAVE_WRITE],
  Guardian: [PERMISSIONS.ATTENDANCE_READ, PERMISSIONS.FINANCE_READ]
};

export function hasPermission(role: string, permission: SystemPermission): boolean {
  const allowedPermissions = ROLES_HIERARCHY[role];
  if (!allowedPermissions) return false;
  return allowedPermissions.includes(permission);
}
