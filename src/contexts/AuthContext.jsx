import { createContext, useContext, useState, useEffect, useMemo } from 'react'
import { authService, userService } from '../services/api'
import { resolveUserRole, isPendingInstructor, isAdminEmail, resolveAppRole } from '../lib/roles'
import { formatErrorMessage } from '../lib/supabaseErrors'
import supabase from '../lib/supabase'

const AuthContext = createContext(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const applyRoleFallback = (userData) => {
    if (!userData) return userData

    return {
      ...userData,
      role: resolveUserRole(userData)
    }
  }

  const mergeAuthProfile = (authUser, profile) => {
    const authEmail = (authUser?.email || '').toString().trim()
    return {
      ...authUser,
      ...profile,
      email: authEmail || profile?.email || '',
      full_name: profile?.full_name || authUser?.full_name || authUser?.user_metadata?.full_name,
      avatar_url: profile?.avatar_url || authUser?.avatar_url || authUser?.user_metadata?.avatar_url,
      role: resolveAppRole(profile, authUser)
    }
  }

  const syncAdminRoleIfNeeded = async (userData) => {
    if (!userData?.id) return userData

    const email = (userData.email || '').toString().trim().toLowerCase()
    if (!isAdminEmail(email)) {
      return userData
    }

    try {
      const syncedProfile = await userService.ensureUserRole(userData.id, email, 'admin')
      return applyRoleFallback(mergeAuthProfile(userData, { ...syncedProfile, role: 'admin' }))
    } catch (err) {
      console.warn('Unable to sync admin role in users table:', err)
      return applyRoleFallback({ ...userData, role: 'admin' })
    }
  }

  const buildSessionUser = (authUser) => {
    if (!authUser?.id) return null
    return applyRoleFallback({
      id: authUser.id,
      email: authUser.email,
      full_name: authUser.user_metadata?.full_name || authUser.email?.split('@')[0],
      avatar_url: authUser.user_metadata?.avatar_url || null,
      role: authUser.user_metadata?.role
    })
  }

  const effectiveUser = useMemo(() => {
    if (user?.id) return user
    if (session?.user?.id) return buildSessionUser(session.user)
    return null
  }, [user, session])

  // Check for existing session on mount
  useEffect(() => {
    checkUser()

    if (supabase) {
      supabase.auth.getSession().then(({ data: { session: activeSession } }) => {
        setSession(activeSession)
      })
    }

    // Listen for auth state changes
    const subscription = authService.onAuthStateChange((event, activeSession) => {
      setSession(activeSession || null)

      if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && activeSession?.user) {
        fetchUserProfile(activeSession.user)
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
      }
    })

    return () => {
      subscription?.unsubscribe?.()
    }
  }, [])

  const checkUser = async () => {
    try {
      setIsLoading(true)
      let currentUser = await authService.getCurrentUser()

      if (!currentUser?.id && supabase) {
        const { data: { session: activeSession } } = await supabase.auth.getSession()
        if (activeSession?.user) {
          setSession(activeSession)
          currentUser = activeSession.user
        }
      }

      if (!currentUser?.id) {
        setUser(null)
        setSession(null)
        return
      }

      const profile = await userService.getOrCreateProfile(currentUser.id, {
        email: currentUser.email,
        full_name: currentUser.full_name || currentUser.user_metadata?.full_name,
        avatar_url: currentUser.avatar_url || currentUser.user_metadata?.avatar_url
      })

      const mergedUser = mergeAuthProfile(currentUser, profile)
      const syncedUser = await syncAdminRoleIfNeeded(applyRoleFallback(mergedUser))
      setUser(syncedUser)
    } catch (err) {
      console.error('Error checking user:', err)
      try {
        const { data: { session: activeSession } } = await supabase.auth.getSession()
        setSession(activeSession)
        if (activeSession?.user) {
          setUser(buildSessionUser(activeSession.user))
        } else {
          setUser(null)
        }
      } catch {
        setUser(null)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const fetchUserProfile = async (authUser) => {
    try {
      // Use getOrCreateProfile which handles missing profiles automatically
      const profile = await userService.getOrCreateProfile(authUser.id, {
        email: authUser.email,
        full_name: authUser.user_metadata?.full_name,
        avatar_url: authUser.user_metadata?.avatar_url
      })
      const mergedUser = mergeAuthProfile(authUser, profile)
      const syncedUser = await syncAdminRoleIfNeeded(applyRoleFallback(mergedUser))
      setUser(syncedUser)
    } catch (err) {
      console.error('Error fetching/creating profile:', err)
      // Still allow login even if profile fetch fails
      const syncedUser = await syncAdminRoleIfNeeded(applyRoleFallback(authUser))
      setUser(syncedUser)
    }
  }

  const login = async (email, password) => {
    try {
      setError(null)
      setIsLoading(true)
      const { user: authUser, session } = await authService.signIn({ email, password })

      if (session) {
        setSession(session)
      }
      
      if (authUser) {
        // Use getOrCreateProfile to handle users without a profile
        const profile = await userService.getOrCreateProfile(authUser.id, {
          email: authUser.email,
          full_name: authUser.user_metadata?.full_name,
          avatar_url: authUser.user_metadata?.avatar_url
        })
        const mergedUser = mergeAuthProfile(authUser, profile)
        const syncedUser = await syncAdminRoleIfNeeded(applyRoleFallback(mergedUser))
        setUser(syncedUser)
      }
      
      return { success: true, user: authUser }
    } catch (err) {
      const message = formatErrorMessage(err)
      setError(message)
      return { success: false, error: message }
    } finally {
      setIsLoading(false)
    }
  }

  const register = async ({ email, password, fullName, role = 'student' }) => {
    try {
      setError(null)
      setIsLoading(true)
      const signupResult = await authService.signUp({
        email,
        password,
        fullName,
        role
      })
      const authUser = signupResult?.user
      const resolvedRole = signupResult?.resolvedRole || role
      
      if (authUser) {
        const withRoleFallback = applyRoleFallback({
          ...authUser,
          full_name: fullName,
          role: resolvedRole
        })
        const syncedUser = await syncAdminRoleIfNeeded(withRoleFallback)
        setUser(syncedUser)
      }
      
      return {
        success: true,
        user: authUser,
        pendingApproval: isPendingInstructor(resolvedRole),
        emailDeliveryFailed: Boolean(signupResult?.emailDeliveryFailed)
      }
    } catch (err) {
      const message = formatErrorMessage(err)
      setError(message)
      return { success: false, error: message }
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    try {
      setError(null)
      await authService.signOut()
      setUser(null)
      setSession(null)
      return { success: true }
    } catch (err) {
      const message = formatErrorMessage(err)
      setError(message)
      return { success: false, error: message }
    }
  }

  const resetPassword = async (email) => {
    try {
      setError(null)
      await authService.resetPassword(email)
      return { success: true }
    } catch (err) {
      const message = formatErrorMessage(err)
      setError(message)
      return { success: false, error: message }
    }
  }

  const updatePassword = async (newPassword) => {
    try {
      setError(null)
      await authService.updatePassword(newPassword)
      return { success: true }
    } catch (err) {
      const message = formatErrorMessage(err)
      setError(message)
      return { success: false, error: message }
    }
  }

  const updateProfile = async (profileData) => {
    try {
      setError(null)
      if (!user?.id) throw new Error('No user logged in')
      
      const updatedProfile = await userService.updateProfile(user.id, profileData)
      setUser(prev => ({ ...prev, ...updatedProfile }))
      return { success: true, profile: updatedProfile }
    } catch (err) {
      const message = formatErrorMessage(err)
      setError(message)
      return { success: false, error: message }
    }
  }

  const uploadAvatar = async (file) => {
    try {
      setError(null)
      if (!user?.id) throw new Error('No user logged in')
      
      const { url } = await userService.uploadAvatar(user.id, file)
      setUser(prev => ({ ...prev, avatar_url: url }))
      return { success: true, url }
    } catch (err) {
      const message = formatErrorMessage(err)
      setError(message)
      return { success: false, error: message }
    }
  }

  const value = {
    user: effectiveUser,
    session,
    isAuthenticated: !!effectiveUser?.id,
    isLoading,
    error,
    login,
    register,
    logout,
    resetPassword,
    updatePassword,
    updateProfile,
    uploadAvatar,
    checkUser
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export default AuthContext