// Permission type definitions
export type Permission =
  | "view:institute_analytics"
  | "create:teachers"
  | "update:teachers"
  | "delete:teachers"
  | "create:courses"
  | "update:courses"
  | "delete:courses"
  | "create:subjects"
  | "update:subjects"
  | "delete:subjects"
  | "view:general_mcqs"
  | "view:mock_mcqs"
  | "view:long_notes"
  | "generate:passkeys"
  | "view:passkeys"
  | "revoke:passkeys"
  | "manage:payments"
  | "view:all_course_analytics"
  | "view:assigned_courses"
  | "create:generalQ"
  | "view:generalQ"
  | "update:generalQ"
  | "delete:generalQ"
  | "create:mockQ"
  | "view:mockQ"
  | "update:mockQ"
  | "delete:mockQ"
  | "create:long_notes"
  | "update:long_notes"
  | "delete:long_notes"
  | "create:publishQ"
  | "view:publishQ"
  | "update:publishQ"
  | "delete:publishQ"
  | "view:student_progress"
  | "view:course_analytics"
  | "view:all_institutes"
  | "view:all_analytics"
  | "view:payment_received"
  | "manage:system_settings"
  | "access:admin_panel";

// Permission definitions
export const PERMISSIONS = {
  // Principal permissions
  PRINCIPAL: [
    "view:institute_analytics",
    "create:teachers",
    "update:teachers",
    "delete:teachers",
    "create:courses",
    "update:courses",
    "delete:courses",
    "create:subjects",
    "update:subjects",
    "delete:subjects",
    "view:general_mcqs",
    "view:mock_mcqs",
    "view:long_notes",
    "generate:passkeys",
    "view:passkeys",
    "revoke:passkeys",
    "manage:payments",
    "view:all_course_analytics",
  ] as Permission[],

  // Teacher permissions
  TEACHER: [
    "view:assigned_courses",

    "create:generalQ",
    "create:generalQ-id",
    "view:generalQ",
    "update:generalQ-id",
    "update:generalQ-id/mcq-id",
    "delete:generalQ",
    "delete:generalQ-id/mcq-id",

    "create:mockQ",
    "create:mockQ-id",
    "view:mockQ",
    "update:mockQ-id",
    "update:mockQ-id/mcq-id",
    "delete:mockQ",
    "delete:mockQ-id/mcq-id",

    "create:long_notes",
    "view:long_notes",
    "update:long_notes",
    "delete:long_notes",

    "create:publishQ",
    "create:publishQ-MCQ",
    "view:publishQ",
    "update:publishQ",
    "delete:publishQ",

    "view:student_progress",
    "view:course_analytics",
  ] as Permission[],

  // Super Admin permissions
  SUPER_ADMIN: [
    "view:all_institutes",
    "view:all_analytics",
    "view:payment_received",
    "manage:system_settings",
    "access:admin_panel",
  ] as Permission[],
};

// Helper function to check permissions
export const hasPermission = (
  userPermissions: string[],
  requiredPermission: Permission
): boolean => {
  return userPermissions.includes(requiredPermission);
};

// Helper function to get default permissions for a role
export const getDefaultPermissions = (role: string): Permission[] => {
  switch (role) {
    case "PRINCIPAL":
      return PERMISSIONS.PRINCIPAL;
    case "TEACHER":
      return PERMISSIONS.TEACHER;
    case "SUPER_ADMIN":
      return PERMISSIONS.SUPER_ADMIN;
    default:
      return [];
  }
};
