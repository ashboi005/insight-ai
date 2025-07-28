
export interface Transcript {
  id: number
  title: string
  content: string
  summary?: string
  sentiment?: string
  original_filename?: string
  storage_file_path?: string
  file_size?: number
  created_by_id: number
  created_at: string
  updated_at: string
}

export interface CreateTranscriptRequest {
  title: string
  content: string
}

export interface UpdateTranscriptRequest {
  title?: string
  content?: string
}

export interface AIGeneratedTask {
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  assigned_team: string
  tags?: string
}

export interface AITasksResponse {
  tasks: AIGeneratedTask[]
  transcript_id: number
}
