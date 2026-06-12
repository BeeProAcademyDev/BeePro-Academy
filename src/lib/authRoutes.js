/**
 * Landing page auth modal URLs (single login/register entry point).
 */
export function getLandingAuthUrl(tab = 'login', { redirect, role } = {}) {
  const params = new URLSearchParams()
  params.set('auth', tab)
  if (redirect) params.set('redirect', redirect)
  if (role) params.set('role', role)
  return `/?${params.toString()}`
}
