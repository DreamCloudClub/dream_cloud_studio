import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import type { Profile } from '@/types/database'
import * as authService from '@/services/auth'

interface AuthContextType {
  user: User | null
  profile: Profile | null
  session: Session | null
  isLoading: boolean
  isAuthenticated: boolean
  signUp: (email: string, password: string, fullName?: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signInWithGoogle: () => Promise<void>
  signInWithGitHub: () => Promise<void>
  signOut: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  updatePassword: (newPassword: string) => Promise<void>
  updateProfile: (updates: Partial<Profile>) => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const profileData = await authService.getProfile(userId)
      setProfile(profileData)
    } catch (error) {
      console.error('Error fetching profile:', error)
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchProfile(user.id)
    }
  }, [user, fetchProfile])

  useEffect(() => {
    let isMounted = true

    // Get initial session with timeout protection
    const initializeAuth = async () => {
      // Safety timeout - never stay loading more than 5 seconds
      const timeoutId = setTimeout(() => {
        if (isMounted) {
          console.warn('Auth initialization timed out')
          setIsLoading(false)
        }
      }, 5000)

      try {
        const session = await authService.getSession()

        if (!isMounted) return

        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user) {
          // Don't let profile fetch block loading
          fetchProfile(session.user.id).catch(console.error)
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
        // Clear any corrupted session data
        if (isMounted) {
          setSession(null)
          setUser(null)
          setProfile(null)
        }
      } finally {
        clearTimeout(timeoutId)
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    initializeAuth()

    // Subscribe to auth changes
    const { data: { subscription } } = authService.onAuthStateChange(async (event, session) => {
      if (!isMounted) return

      setSession(session)
      setUser(session?.user ?? null)

      if (event === 'SIGNED_IN' && session?.user) {
        fetchProfile(session.user.id).catch(console.error)
      } else if (event === 'SIGNED_OUT') {
        setProfile(null)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [fetchProfile])

  const signUp = async (email: string, password: string, fullName?: string) => {
    setIsLoading(true)
    try {
      await authService.signUp(email, password, fullName)
    } finally {
      setIsLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    setIsLoading(true)
    try {
      await authService.signIn(email, password)
    } finally {
      setIsLoading(false)
    }
  }

  const signInWithGoogle = async () => {
    await authService.signInWithProvider('google')
  }

  const signInWithGitHub = async () => {
    await authService.signInWithProvider('github')
  }

  const signOut = async () => {
    setIsLoading(true)
    try {
      await authService.signOut()
      setUser(null)
      setProfile(null)
      setSession(null)
    } finally {
      setIsLoading(false)
    }
  }

  const resetPassword = async (email: string) => {
    await authService.resetPassword(email)
  }

  const updatePassword = async (newPassword: string) => {
    await authService.updatePassword(newPassword)
  }

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) throw new Error('Not authenticated')
    const updated = await authService.updateProfile(user.id, updates)
    setProfile(updated)
  }

  const value: AuthContextType = {
    user,
    profile,
    session,
    isLoading,
    isAuthenticated: !!user,
    signUp,
    signIn,
    signInWithGoogle,
    signInWithGitHub,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    refreshProfile,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

// HOC for protected routes
export function withAuth<P extends object>(Component: React.ComponentType<P>) {
  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated, isLoading } = useAuth()

    if (isLoading) {
      return (
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-sky-500"></div>
        </div>
      )
    }

    if (!isAuthenticated) {
      // Redirect to login - in a real app, use react-router's Navigate
      window.location.href = '/login'
      return null
    }

    return <Component {...props} />
  }
}
