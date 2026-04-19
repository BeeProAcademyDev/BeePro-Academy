import { createContext, useContext, useState, useEffect } from 'react'
import { authService, userService } from '../services/api'

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
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  const applyRoleFallback = (userData) => {
    if (!userData) return userData

    const email = (userData.email || '').toString().trim().toLowerCase()
    const configuredAdminEmails = (import.meta.env.VITE_ADMIN_EMAILS || 'admin@bepro.academy')
      .split(',')
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean)

    const role = (userData.role || '').toString().trim().toLowerCase()
    const isAdminEmail = configuredAdminEmails.includes(email)

    return {
      ...userData,
      role: isAdminEmail ? 'admin' : (role || userData.role)
    }
  }

  const syncAdminRoleIfNeeded = async (userData) => {
    if (!userData?.id) return userData

    const email = (userData.email || '').toString().trim().toLowerCase()
    const configuredAdminEmails = (import.meta.env.VITE_ADMIN_EMAILS || 'admin@bepro.academy')
      .split(',')
      .map((entry) => entry.trim().toLowerCase())
      .filter(Boolean)

    if (!configuredAdminEmails.includes(email)) {
      return userData
    }

    try {
      const syncedProfile = await userService.ensureUserRole(userData.id, email, 'admin')
      return { ...userData, ...syncedProfile, role: 'admin' }
    } catch (err) {
      console.warn('Unable to sync admin role in users table:', err)
      return { ...userData, role: 'admin' }
    }
  }

  // Check for existing session on mount
  useEffect(() => {
    checkUser()
    
    // Listen for auth state changes
    const subscription = authService.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        fetchUserProfile(session.user)
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
      } else if (event === 'TOKEN_REFRESHED') {
        // Session refreshed, user still logged in
      }
    })

    return () => {
      subscription?.unsubscribe?.()
    }
  }, [])

  const checkUser = async () => {
    try {
      setIsLoading(true)
      const currentUser = await authService.getCurrentUser()
      const withRoleFallback = applyRoleFallback(currentUser)
      const syncedUser = await syncAdminRoleIfNeeded(withRoleFallback)
      setUser(syncedUser)
    } catch (err) {
      console.error('Error checking user:', err)
      setUser(null)
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
      const withRoleFallback = applyRoleFallback({ ...authUser, ...profile })
      const syncedUser = await syncAdminRoleIfNeeded(withRoleFallback)
      setUser(syncedUser)
    } catch (err) {
      console.error('Error fetching/creating profile:', err)
      // Still allow login even if profile fetch fails
      const withRoleFallback = applyRoleFallback(authUser)
      const syncedUser = await syncAdminRoleIfNeeded(withRoleFallback)
      setUser(syncedUser)
    }
  }

  const login = async (email, password) => {
    try {
      setError(null)
      setIsLoading(true)
      const { user: authUser, session } = await authService.signIn({ email, password })
      
      if (authUser) {
        // Use getOrCreateProfile to handle users without a profile
        const profile = await userService.getOrCreateProfile(authUser.id, {
          email: authUser.email,
          full_name: authUser.user_metadata?.full_name,
          avatar_url: authUser.user_metadata?.avatar_url
        })
        const withRoleFallback = applyRoleFallback({ ...authUser, ...profile })
        const syncedUser = await syncAdminRoleIfNeeded(withRoleFallback)
        setUser(syncedUser)
      }
      
      return { success: true, user: authUser }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setIsLoading(false)
    }
  }

  const register = async ({ email, password, fullName, role = 'student' }) => {
    try {
      setError(null)
      setIsLoading(true)
      const { user: authUser, session } = await authService.signUp({
        email,
        password,
        fullName,
        role
      })
      
      if (authUser) {
        const withRoleFallback = applyRoleFallback({ ...authUser, full_name: fullName, role })
        const syncedUser = await syncAdminRoleIfNeeded(withRoleFallback)
        setUser(syncedUser)
      }
      
      return { success: true, user: authUser }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    try {
      setError(null)
      await authService.signOut()
      setUser(null)
      return { success: true }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    }
  }

  const resetPassword = async (email) => {
    try {
      setError(null)
      await authService.resetPassword(email)
      return { success: true }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    }
  }

  const updatePassword = async (newPassword) => {
    try {
      setError(null)
      await authService.updatePassword(newPassword)
      return { success: true }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
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
      setError(err.message)
      return { success: false, error: err.message }
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
      setError(err.message)
      return { success: false, error: err.message }
    }
  }

  const value = {
    user,
    isAuthenticated: !!user,
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