// Task-related API functions
import { Task, TaskUpdate, TaskAnalytics } from '../../types/tasks_types'

// Base API configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

// API client for tasks
class TaskApiClient {
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

    // Add JWT token from localStorage as Authorization header
    const token = localStorage.getItem('authToken')
    if (token) {
      config.headers = {
        ...config.headers,
        'Authorization': `Bearer ${token}`,
      }
    }

    try {
      console.log('Making tasks request to:', url)
      console.log('Request config:', {
        ...config,
        headers: config.headers
      })
      
      const response = await fetch(url, config)
      
      console.log('Tasks response status:', response.status)
      console.log('Tasks response ok:', response.ok)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          detail: 'An unexpected error occurred'
        }))
        console.log('Tasks error data:', errorData)
        throw new Error(errorData.detail || `HTTP ${response.status}`)
      }

      const data = await response.json()
      console.log('Tasks response data:', data)
      return data
    } catch (error) {
      console.error('Tasks fetch error details:', error)
      
      if (error instanceof Error) {
        console.error('Tasks error details:', {
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

  // Task endpoints
  async getTasks(params: {
    skip?: number
    limit?: number
    myTeamOnly?: boolean
    statusFilter?: string
    priorityFilter?: string
    search?: string
  } = {}): Promise<Task[]> {
    const queryParams = new URLSearchParams()
    
    if (params.skip !== undefined) queryParams.append('skip', params.skip.toString())
    if (params.limit !== undefined) queryParams.append('limit', params.limit.toString())
    if (params.myTeamOnly) queryParams.append('my_team_only', 'true')
    if (params.statusFilter) queryParams.append('status_filter', params.statusFilter)
    if (params.priorityFilter) queryParams.append('priority_filter', params.priorityFilter)
    if (params.search) queryParams.append('search', params.search)

    return this.request<Task[]>(`/tasks/?${queryParams.toString()}`)
  }

  async getTask(id: number): Promise<Task> {
    return this.request<Task>(`/tasks/${id}`)
  }

  async updateTask(id: number, data: TaskUpdate): Promise<Task> {
    return this.request<Task>(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteTask(id: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/tasks/${id}`, {
      method: 'DELETE',
    })
  }

  async getAnalytics(myTeamOnly = false): Promise<TaskAnalytics> {
    const params = myTeamOnly ? '?my_team_only=true' : ''
    return this.request<TaskAnalytics>(`/tasks/analytics/dashboard${params}`)
  }
}

// Create API client instance
const taskApiClient = new TaskApiClient(API_BASE_URL)

// Task API functions
export const tasksAPI = {
  /**
   * Get all tasks with optional filtering
   */
  getAll: async (params: {
    skip?: number
    limit?: number
    myTeamOnly?: boolean
    statusFilter?: string
    priorityFilter?: string
    search?: string
  } = {}): Promise<Task[]> => {
    return await taskApiClient.getTasks(params)
  },

  /**
   * Get a specific task by ID
   */
  getById: async (id: number): Promise<Task> => {
    return await taskApiClient.getTask(id)
  },

  /**
   * Update a task
   */
  update: async (id: number, data: TaskUpdate): Promise<Task> => {
    return await taskApiClient.updateTask(id, data)
  },

  /**
   * Delete a task
   */
  delete: async (id: number): Promise<{ message: string }> => {
    return await taskApiClient.deleteTask(id)
  },

  /**
   * Toggle task completion status
   */
  toggleComplete: async (id: number, currentStatus: string): Promise<Task> => {
    const newStatus = currentStatus === 'completed' ? 'todo' : 'completed'
    return await taskApiClient.updateTask(id, { status: newStatus })
  },

  /**
   * Get task analytics for dashboard
   */
  getAnalytics: async (myTeamOnly = false): Promise<TaskAnalytics> => {
    return await taskApiClient.getAnalytics(myTeamOnly)
  }
}

export default tasksAPI
