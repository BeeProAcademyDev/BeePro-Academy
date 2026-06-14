export const ROLES = {
  STUDENT: 'student',
  PENDING_INSTRUCTOR: 'pending_instructor',
  INSTRUCTOR: 'instructor',
  TEACHER: 'teacher',
  ADMIN: 'admin'
}

/**
 * Maps UI signup choice to a non-privileged account type.
 * Admin role assignment is never accepted from the client.
 */
export function normalizeSignupAccountType(selectedRole) {
  const choice = (selectedRole || ROLES.STUDENT).toString().trim().toLowerCase()
  if (choice === ROLES.INSTRUCTOR || choice === ROLES.TEACHER || choice === 'academic') {
    return ROLES.TEACHER
  }
  return ROLES.STUDENT
}

export function resolveSignupRole(selectedRole) {
  const choice = (selectedRole || ROLES.STUDENT).toString().trim().toLowerCase()

  if (choice === ROLES.INSTRUCTOR || choice === ROLES.TEACHER || choice === 'academic') {
    return ROLES.PENDING_INSTRUCTOR
  }

  return ROLES.STUDENT
}

const AUTH_JWT_ROLES = new Set(['authenticated', 'anon', 'service_role'])

export function normalizeRole(role) {
  const normalized = (role || '').toString().trim().toLowerCase()
  if (AUTH_JWT_ROLES.has(normalized)) return ''
  return normalized
}

/** Normalize legacy DB role values for admin UI and comparisons. */
export function normalizeDbRole(role) {
  const normalized = normalizeRole(role)
  if (normalized === 'teacher') return ROLES.INSTRUCTOR
  return normalized || ROLES.STUDENT
}

/** App role from DB profile only. Auth/JWT metadata is explicitly untrusted. */
export function resolveAppRole(profile) {
  const fromProfile = normalizeRole(profile?.role)
  if (fromProfile) return fromProfile

  return ROLES.STUDENT
}

export function isPendingInstructor(role) {
  return normalizeRole(role) === ROLES.PENDING_INSTRUCTOR
}

export function isApprovedInstructor(role) {
  const normalized = normalizeRole(role)
  return normalized === ROLES.INSTRUCTOR || normalized === ROLES.TEACHER
}

export function isAdmin(role) {
  const normalized = normalizeRole(role)
  return normalized === ROLES.ADMIN
}

export function canAccessTeacherFeatures(role) {
  const normalized = normalizeRole(role)
  return normalized === ROLES.INSTRUCTOR
    || normalized === ROLES.TEACHER
    || normalized === ROLES.ADMIN
}

/** Any logged-in user who is not staff/instructor — defaults missing role to student */
export function isStudentUser(user) {
  if (!user?.id) return false
  return resolveUserRole(user) === ROLES.STUDENT
}

/** Navbar chat icon — students only (resolved role, not raw metadata) */
export function shouldShowStudentChatBell(user) {
  if (!user?.id) return false
  const resolved = resolveUserRole(user)
  return resolved === ROLES.STUDENT || resolved === ROLES.PENDING_INSTRUCTOR
}

export function resolveUserRole(user) {
  if (!user) return ROLES.STUDENT
  const role = normalizeRole(user.role)
  if (isAdmin(role)) return ROLES.ADMIN
  if (canAccessTeacherFeatures(role)) return role || ROLES.TEACHER
  if (isPendingInstructor(role)) return ROLES.PENDING_INSTRUCTOR
  return role || ROLES.STUDENT
}

export function getRoleLabel(role, language = 'ar') {
  const labels = {
    ar: {
      student: 'طالب',
      pending_instructor: 'مدرس (بانتظار الموافقة)',
      instructor: 'مدرس',
      teacher: 'مدرس',
      admin: 'إداري'
    },
    en: {
      student: 'Student',
      pending_instructor: 'Instructor (Pending)',
      instructor: 'Instructor',
      teacher: 'Instructor',
      admin: 'Admin'
    }
  }

  const lang = language === 'ar' ? 'ar' : 'en'
  return labels[lang][normalizeRole(role)] || role
}

export default {
  ROLES,
  normalizeSignupAccountType,
  resolveSignupRole,
  normalizeRole,
  normalizeDbRole,
  resolveAppRole,
  isPendingInstructor,
  isApprovedInstructor,
  isAdmin,
  canAccessTeacherFeatures,
  isStudentUser,
  shouldShowStudentChatBell,
  resolveUserRole,
  getRoleLabel
}
