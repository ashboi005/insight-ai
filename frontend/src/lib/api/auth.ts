import { 
  LoginRequest, 
  RegisterRequest, 
  AuthResponse, 
  RefreshTokenResponse,
  PasswordChangeRequest,
  User,
  AuthError 
} from '@/types/auth_types'

// Base API configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

// API client with error handling
class ApiClient {
  private baseURL: string

  constructor(baseURL: string) {
    this.baseURL = baseURL
  }

  private async request<T>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`
    
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    }

    // Add JWT token from localStorage as Authorization header (except for login/register)
    if (!endpoint.includes('/auth/login') && !endpoint.includes('/auth/register')) {
      const token = localStorage.getItem('authToken')
      if (token) {
        config.headers = {
          ...config.headers,
          'Authorization': `Bearer ${token}`,
        }
      }
    }

    try {
      console.log('Making request to:', url)
      console.log('Request config:', {
        ...config,
        headers: config.headers
      })
      
      const response = await fetch(url, config)
      
      console.log('Response status:', response.status)
      console.log('Response ok:', response.ok)
      
      if (!response.ok) {
        const errorData: AuthError = await response.json().catch(() => ({
          detail: 'An unexpected error occurred',
          status_code: response.status
        }))
        console.log('Error data:', errorData)
        throw new Error(errorData.detail || `HTTP ${response.status}`)
      }

      const data = await response.json()
      console.log('Response data:', data)
      return data
    } catch (error) {
      console.error('Fetch error details:', error)
      
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          name: error.name,
          stack: error.stack
        })
        
        // Check for specific network errors
        if (error.message === 'Failed to fetch') {
          throw new Error('Unable to connect to server. Please check if the backend is running and CORS is configured properly.')
        }
        throw error
      }
      throw new Error('Network error occurred')
    }
  }

  // Auth endpoints
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    })
  }

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    })
  }

  async refreshToken(refreshToken: string): Promise<RefreshTokenResponse> {
    return this.request<RefreshTokenResponse>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
  }

  async getCurrentUser(): Promise<User> {
    return this.request<User>('/auth/me')
  }

  async changePassword(passwordData: PasswordChangeRequest): Promise<{ message: string }> {
    return this.request<{ message: string }>('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify(passwordData),
    })
  }

  async updateProfile(profileData: { first_name: string; last_name: string; team: string }): Promise<User> {
    return this.request<User>('/auth/me', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    })
  }

  async logout(): Promise<{ message: string }> {
    return this.request<{ message: string }>('/auth/logout', {
      method: 'POST',
    })
  }
}

// Create API client instance
const apiClient = new ApiClient(API_BASE_URL)

// Auth API functions
export const authAPI = {
  /**
   * Login user with email and password
   */
  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    const response = await apiClient.login(credentials)
    
    // Store tokens in localStorage
    localStorage.setItem('authToken', response.access_token)
    localStorage.setItem('refreshToken', response.refresh_token)
    
    return response
  },

  /**
   * Register new user
   */
  register: async (userData: RegisterRequest): Promise<AuthResponse> => {
    const response = await apiClient.register(userData)
    
    // Store tokens in localStorage
    localStorage.setItem('authToken', response.access_token)
    localStorage.setItem('refreshToken', response.refresh_token)
    
    return response
  },

  /**
   * Refresh access token using refresh token
   */
  refreshToken: async (): Promise<RefreshTokenResponse> => {
    const refreshToken = localStorage.getItem('refreshToken')
    if (!refreshToken) {
      throw new Error('No refresh token available')
    }

    const response = await apiClient.refreshToken(refreshToken)
    
    // Update access token in localStorage
    localStorage.setItem('authToken', response.access_token)
    
    return response
  },

  /**
   * Get current user profile
   */
  getCurrentUser: async (): Promise<User> => {
    return await apiClient.getCurrentUser()
  },

  /**
   * Change user password
   */
  changePassword: async (passwordData: PasswordChangeRequest): Promise<{ message: string }> => {
    return await apiClient.changePassword(passwordData)
  },

  /**
   * Update user profile
   */
  updateProfile: async (profileData: { first_name: string; last_name: string; team: string }): Promise<User> => {
    return await apiClient.updateProfile(profileData)
  },

  /**
   * Logout user and clear tokens
   */
  logout: async (): Promise<void> => {
    // For localStorage-based auth, we just need to clear local data
    // No backend call needed since tokens are stored client-side
    localStorage.removeItem('authToken')
    localStorage.removeItem('refreshToken') 
    localStorage.removeItem('userEmail')
  },

  /**
   * Check if user is authenticated (has valid token)
   */
  isAuthenticated: (): boolean => {
    const token = localStorage.getItem('authToken')
    return !!token
  },

  /**
   * Clear all auth data from localStorage
   */
  clearAuthData: (): void => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('userEmail')
  }
}

export default authAPI