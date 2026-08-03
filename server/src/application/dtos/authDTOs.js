/**
 * Data Transfer Objects for Auth operations.
 * Shape data between layers without leaking domain internals.
 */

/**
 * Sanitize a user record for API responses.
 * Strips password_hash, reset_token, and other sensitive fields.
 */
function toUserDTO(user) {
  if (!user) return null

  return {
    id: user.id,
    full_name: user.full_name ?? user.fullName,
    email: user.email,
    role: user.role,
    status: user.status,
    avatar_url: user.avatar_url ?? user.avatarUrl ?? null,
    phone: user.phone ?? null,
    bio: user.bio ?? null,
    created_at: user.created_at ?? user.createdAt,
    updated_at: user.updated_at ?? user.updatedAt,
  }
}

/**
 * Shape an auth response with user + tokens.
 */
function toAuthResponseDTO(user, accessToken, refreshToken) {
  return {
    user: toUserDTO(user),
    tokens: {
      access_token: accessToken,
      refresh_token: refreshToken,
    },
  }
}

module.exports = { toUserDTO, toAuthResponseDTO }
