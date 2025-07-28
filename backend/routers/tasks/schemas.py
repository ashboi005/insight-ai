from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from models import TaskStatus, TaskPriority, Team

class TaskUpdate(BaseModel):
    title: Optional[str] = Field(None, max_length=255)
    description: Optional[str] = None
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    assigned_team: Optional[Team] = None
    tags: Optional[str] = None

class TaskResponse(BaseModel):
    id: int
    title: str
    description: str
    status: TaskStatus
    priority: TaskPriority
    assigned_team: Team
    tags: Optional[str] = None
    transcript_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class TaskStatsResponse(BaseModel):
    total_tasks: int
    completed_tasks: int
    pending_tasks: int
    in_progress_tasks: int
    high_priority: int
    medium_priority: int
    low_priority: int
    completion_rate: float

class TeamStatsResponse(BaseModel):
    team: str
    total_tasks: int
    completed_tasks: int
    completion_rate: float

class TaskAnalyticsResponse(BaseModel):
    overall_stats: TaskStatsResponse
    team_breakdown: List[TeamStatsResponse]
    recent_activity: List[TaskResponse]
