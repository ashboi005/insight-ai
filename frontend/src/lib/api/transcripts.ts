// Transcript-related API functions
import { Transcript, CreateTranscriptRequest, UpdateTranscriptRequest, AITasksResponse } from '../../types/transcripts_types'
// Base API configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000'

// API client for transcripts
class TranscriptApiClient {
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
      credentials: 'include', // Include cookies in requests
      ...options,
    }

    // Get JWT from cookies and add as Authorization header
    const token = this.getTokenFromCookies()
    if (token) {
      config.headers = {
        ...config.headers,
        'Authorization': `Bearer ${token}`,
      }
    }

    try {
      const response = await fetch(url, config)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({
          detail: 'An unexpected error occurred'
        }))
        throw new Error(errorData.detail || `HTTP ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      if (error instanceof Error) {
        throw error
      }
      throw new Error('Network error occurred')
    }
  }

  // Helper method to extract JWT token from cookies
  private getTokenFromCookies(): string | null {
    if (typeof document === 'undefined') return null
    
    const cookies = document.cookie.split(';')
    for (let cookie of cookies) {
      const [name, value] = cookie.trim().split('=')
      if (name === 'access_token') { // Adjust cookie name as per your backend
        return value
      }
    }
    return null
  }

  // Transcript endpoints
  async createTranscript(data: CreateTranscriptRequest): Promise<Transcript> {
    return this.request<Transcript>('/transcripts/', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  async uploadTranscriptFile(file: File, title: string): Promise<Transcript> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('title', title)

    return this.request<Transcript>('/transcripts/upload', {
      method: 'POST',
      body: formData,
      headers: {} // Remove Content-Type for multipart/form-data
    })
  }

  async getTranscripts(skip = 0, limit = 100): Promise<Transcript[]> {
    return this.request<Transcript[]>(`/transcripts/?skip=${skip}&limit=${limit}`)
  }

  async getTranscript(id: number): Promise<Transcript> {
    return this.request<Transcript>(`/transcripts/${id}`)
  }

  async updateTranscript(id: number, data: UpdateTranscriptRequest): Promise<Transcript> {
    return this.request<Transcript>(`/transcripts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  async deleteTranscript(id: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/transcripts/${id}`, {
      method: 'DELETE',
    })
  }

  async generateTasks(transcriptId: number): Promise<AITasksResponse> {
    return this.request<AITasksResponse>(`/transcripts/${transcriptId}/generate-tasks`, {
      method: 'POST',
    })
  }

  async downloadTranscript(id: number): Promise<Blob> {
    const url = `${this.baseURL}/transcripts/${id}/download`
    const token = this.getTokenFromCookies()
    
    const response = await fetch(url, {
      credentials: 'include',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    })

    if (!response.ok) {
      throw new Error('Failed to download transcript')
    }

    return response.blob()
  }

  async getTranscriptTasks(
    transcriptId: number,
    myTeamOnly = false,
    statusFilter?: string
  ): Promise<any[]> {
    const params = new URLSearchParams()
    if (myTeamOnly) params.append('my_team_only', 'true')
    if (statusFilter) params.append('status_filter', statusFilter)

    return this.request<any[]>(`/transcripts/${transcriptId}/tasks?${params.toString()}`)
  }
}

// Create API client instance
const transcriptApiClient = new TranscriptApiClient(API_BASE_URL)

// Transcript API functions
export const transcriptsAPI = {
  /**
   * Create a new transcript with manual text entry
   */
  create: async (data: CreateTranscriptRequest): Promise<Transcript> => {
    return await transcriptApiClient.createTranscript(data)
  },

  /**
   * Upload a transcript file (.txt)
   */
  upload: async (file: File, title: string): Promise<Transcript> => {
    return await transcriptApiClient.uploadTranscriptFile(file, title)
  },

  /**
   * Get all transcripts with pagination
   */
  getAll: async (skip = 0, limit = 100): Promise<Transcript[]> => {
    return await transcriptApiClient.getTranscripts(skip, limit)
  },

  /**
   * Get a specific transcript by ID
   */
  getById: async (id: number): Promise<Transcript> => {
    return await transcriptApiClient.getTranscript(id)
  },

  /**
   * Update a transcript
   */
  update: async (id: number, data: UpdateTranscriptRequest): Promise<Transcript> => {
    return await transcriptApiClient.updateTranscript(id, data)
  },

  /**
   * Delete a transcript
   */
  delete: async (id: number): Promise<{ message: string }> => {
    return await transcriptApiClient.deleteTranscript(id)
  },

  /**
   * Generate AI tasks from a transcript
   */
  generateTasks: async (transcriptId: number): Promise<AITasksResponse> => {
    return await transcriptApiClient.generateTasks(transcriptId)
  },

  /**
   * Download transcript file
   */
  download: async (id: number, filename?: string): Promise<void> => {
    const blob = await transcriptApiClient.downloadTranscript(id)
    
    // Create download link
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename || `transcript_${id}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  },

  /**
   * Get tasks for a specific transcript
   */
  getTasks: async (
    transcriptId: number,
    myTeamOnly = false,
    statusFilter?: string
  ): Promise<any[]> => {
    return await transcriptApiClient.getTranscriptTasks(transcriptId, myTeamOnly, statusFilter)
  }
}

export default transcriptsAPI