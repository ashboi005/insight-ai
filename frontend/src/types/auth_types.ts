// Auth-related TypeScript types and interfaces

export interface User {
  id: number
  email: string
  first_name: string
  last_name: string
  team: Team
  role?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  password: string
  first_name: string
  last_name: string
  team: Team
}

export interface AuthResponse {
  access_token: string
  refresh_token: string
  token_type: "bearer"
  user: User
}

export interface RefreshTokenRequest {
  refresh_token: string
}

export interface RefreshTokenResponse {
  access_token: string
  token_type: "bearer"
}

export interface PasswordChangeRequest {
  current_password: string
  new_password: string
}

export enum Team {
  SALES = "Sales",
  DEVS = "Devs", 
  MARKETING = "Marketing",
  DESIGN = "Design",
  OPERATIONS = "Operations",
  FINANCE = "Finance",
  HR = "HR",
  GENERAL = "General"
}

// Error response from API
export interface AuthError {
  detail: string
  status_code: number
}

// Auth context/state types
export interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

export interface AuthContextType extends AuthState {
  login: (credentials: LoginRequest) => Promise<void>
  register: (userData: RegisterRequest) => Promise<void>
  logout: () => void
  refreshToken: () => Promise<void>
  clearError: () => void
}
