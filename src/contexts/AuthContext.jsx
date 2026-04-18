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
      setUser(applyRoleFallback(currentUser))
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
      setUser(applyRoleFallback({ ...authUser, ...profile }))
    } catch (err) {
      console.error('Error fetching/creating profile:', err)
      // Still allow login even if profile fetch fails
      setUser(applyRoleFallback(authUser))
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
        setUser(applyRoleFallback({ ...authUser, ...profile }))
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
        setUser(applyRoleFallback({ ...authUser, full_name: fullName, role }))
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