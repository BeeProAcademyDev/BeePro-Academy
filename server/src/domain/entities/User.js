/**
 * User Entity — Pure domain model.
 * No framework dependencies. Contains business rules only.
 */
class User {
  constructor({
    id,
    fullName,
    email,
    passwordHash = null,
    role = 'student',
    avatarUrl = null,
    phone = null,
    isSuspended = false,
    resetToken = null,
    resetTokenExp = null,
    createdAt = new Date(),
    updatedAt = new Date(),
  }) {
    this.id = id
    this.fullName = fullName
    this.email = email
    this.passwordHash = passwordHash
    this.role = role
    this.avatarUrl = avatarUrl
    this.phone = phone
    this.isSuspended = isSuspended
    this.resetToken = resetToken
    this.resetTokenExp = resetTokenExp
    this.createdAt = createdAt
    this.updatedAt = updatedAt
  }

  // ── Business Rules ──

  static VALID_ROLES = ['student', 'pending_instructor', 'instructor', 'teacher', 'admin']

  static SIGNUP_ALLOWED_ROLES = ['student', 'instructor', 'teacher']

  static normalizeEmail(email) {
    return (email || '').toString().trim().toLowerCase()
  }

  static isValidRole(role) {
    return User.VALID_ROLES.includes((role || '').toString().trim().toLowerCase())
  }

  /**
   * Resolves the role a user should get at signup.
   * Admin is never allowed from client-side. Instructor becomes pending_instructor.
   */
  static resolveSignupRole(requestedRole) {
    const normalized = (requestedRole || 'student').toString().trim().toLowerCase()

    if (['instructor', 'teacher', 'academic'].includes(normalized)) {
      return 'pending_instructor'
    }

    return 'student'
  }

  static validatePassword(password) {
    if (!password || password.length < 8) {
      return { valid: false, message: 'Password must be at least 8 characters long' }
    }
    if (!/[A-Z]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one uppercase letter' }
    }
    if (!/[a-z]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one lowercase letter' }
    }
    if (!/[0-9]/.test(password)) {
      return { valid: false, message: 'Password must contain at least one number' }
    }
    return { valid: true }
  }

  isActive() {
    return !this.isSuspended
  }

  isPendingInstructor() {
    return this.role === 'pending_instructor'
  }

  isAdmin() {
    return this.role === 'admin'
  }

  canAccessTeacherFeatures() {
    return ['instructor', 'teacher', 'admin'].includes(this.role)
  }

  /**
   * Returns a sanitized object (no sensitive fields).
   */
  toSafeObject() {
    return {
      id: this.id,
      full_name: this.fullName,
      email: this.email,
      role: this.role,
      avatar_url: this.avatarUrl,
      phone: this.phone,
      is_suspended: this.isSuspended,
      created_at: this.createdAt,
      updated_at: this.updatedAt,
    }
  }
}

module.exports = User
