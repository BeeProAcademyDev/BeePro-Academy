import { canAccessTeacherFeatures, isAdmin, normalizeRole } from './roles'

export function requireAuth(user) {
  return Boolean(user?.id)
}

export function requireAdmin(user) {
  if (!requireAuth(user)) return false
  return isAdmin(user.role)
}

export function requireInstructor(user) {
  if (!requireAuth(user)) return false
  return canAccessTeacherFeatures(user.role)
}

export function requireOwner(user, ownerId) {
  if (!requireAuth(user) || !ownerId) return false
  return user.id === ownerId || requireAdmin(user)
}

export function requireRole(user, allowedRoles = []) {
  if (!requireAuth(user)) return false
  const normalized = normalizeRole(user.role)
  return allowedRoles.map(normalizeRole).includes(normalized)
}

export default {
  requireAuth,
  requireAdmin,
  requireInstructor,
  requireOwner,
  requireRole
}
