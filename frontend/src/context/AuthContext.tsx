'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { authAPI } from '@/lib/api'
import { User, Team } from '@/types/auth_types'
import { toast } from 'sonner'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, firstName: string, lastName: string, team: string) => Promise<void>
  logout: () => void
  refreshToken: () => Promise<void>
  updateUser: (profileData: { first_name: string; last_name: string; team: string }) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  const isAuthenticated = !!user

  // Check if user is logged in on app start
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('authToken')
        if (token) {
          // Try to get current user to validate token
          const userData = await authAPI.getCurrentUser()
          setUser(userData)
        }
      } catch {
        // Token is invalid, clear it
        authAPI.clearAuthData()
        setUser(null)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true)
      await authAPI.login({ email, password })
      
      // Get user data (tokens are stored in localStorage by authAPI.login)
      const userData = await authAPI.getCurrentUser()
      setUser(userData)
      
      toast.success('Login successful!')
      router.push('/dashboard')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed'
      toast.error(message)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const register = async (
    email: string, 
    password: string, 
    firstName: string, 
    lastName: string, 
    team: string
  ) => {
    try {
      setIsLoading(true)
      await authAPI.register({
        email,
        password,
        first_name: firstName,
        last_name: lastName,
        team: team as Team
      })
      
      // Get user data (tokens are stored in localStorage by authAPI.register)
      const userData = await authAPI.getCurrentUser()
      setUser(userData)
      
      toast.success('Registration successful!')
      router.push('/dashboard')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed'
      toast.error(message)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    authAPI.logout() // This will clear localStorage and call logout API
    setUser(null)
    toast.info('Logged out successfully')
    router.push('/login')
  }

  const refreshToken = async () => {
    try {
      await authAPI.refreshToken()
      // Token has been updated in localStorage
    } catch (error) {
      // Refresh failed, logout user
      logout()
      throw error
    }
  }

  const updateUser = async (profileData: { first_name: string; last_name: string; team: string }) => {
    try {
      setIsLoading(true)
      const updatedUser = await authAPI.updateProfile(profileData)
      setUser(updatedUser)
      toast.success('Profile updated successfully!')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Profile update failed'
      toast.error(message)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    refreshToken,
    updateUser,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
