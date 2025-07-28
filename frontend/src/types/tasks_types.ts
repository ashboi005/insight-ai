
export interface Task {
  id: number
  title: string
  description: string
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
  assigned_team: string
  tags?: string
  transcript_id: number
  created_at: string
  updated_at: string
}

export interface TaskUpdate {
  title?: string
  description?: string
  status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'
  priority?: 'HIGH' | 'MEDIUM' | 'LOW'
  assigned_team?: string
  tags?: string
}

export interface TaskStats {
  total_tasks: number
  completed_tasks: number
  pending_tasks: number
  in_progress_tasks: number
  high_priority: number
  medium_priority: number
  low_priority: number
  completion_rate: number
}

export interface TeamStats {
  team: string
  total_tasks: number
  completed_tasks: number
  completion_rate: number
}

export interface TaskAnalytics {
  overall_stats: TaskStats
  team_breakdown: TeamStats[]
  recent_activity: Task[]
}