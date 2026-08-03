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
    status = 'active',
    bio = null,
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
    this.status = status
    this.bio = bio
    this.resetToken = resetToken
    this.resetTokenExp = resetTokenExp
    this.createdAt = createdAt
    this.updatedAt = updatedAt
  }

  // ── Business Rules ──

  static VALID_ROLES = ['student','instructor', 'admin']

  static SIGNUP_ALLOWED_ROLES = ['student','instructor', 'admin']

  static normalizeEmail(email) {
    return (email || '').toString().trim().toLowerCase()
  }

  static isValidRole(role) {
    return User.VALID_ROLES.includes((role || '').toString().trim().toLowerCase())
  }

  /**
   * Resolves the role and status a user should get at signup.
   * Instructor becomes pending status.
   */
  static resolveSignup(requestedRole) {
    const normalized = (requestedRole || 'student').toString().trim().toLowerCase()

    if (['instructor', 'teacher', 'academic'].includes(normalized)) {
      return { role: 'instructor', status: 'pending' }
    }

    return { role: 'student', status: 'active' }
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
    return this.status === 'active'
  }

  isPending() {
    return this.status === 'pending'
  }

  isAdmin() {
    return this.role === 'admin'
  }

  canAccessTeacherFeatures() {
    return ['instructor', 'admin'].includes(this.role)
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
      status: this.status,
      avatar_url: this.avatarUrl,
      phone: this.phone,
      bio: this.bio,
      created_at: this.createdAt,
      updated_at: this.updatedAt,
    }
  }
}

module.exports = User
