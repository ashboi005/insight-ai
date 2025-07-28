from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from models import TaskStatus, TaskPriority, Team

# Transcript Schemas
class TranscriptCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    content: str = Field(..., min_length=10)

class TranscriptResponse(BaseModel):
    id: int
    title: str
    content: str
    summary: Optional[str]
    sentiment: Optional[str] 
    original_filename: Optional[str]
    storage_file_path: Optional[str]
    file_size: Optional[int]
    created_by_id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class TranscriptUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    content: Optional[str] = Field(None, min_length=10)

class TranscriptWithTasksResponse(BaseModel):
    id: int
    title: str
    content: str
    summary: Optional[str]
    original_filename: Optional[str]
    storage_file_path: Optional[str]
    file_size: Optional[int]
    created_by_id: int
    created_at: datetime
    updated_at: datetime
    tasks: List["TaskResponse"]
    
    class Config:
        from_attributes = True

class AIGeneratedTask(BaseModel):
    title: str
    description: Optional[str] = None
    priority: TaskPriority = TaskPriority.MEDIUM
    assigned_team: Team
    tags: Optional[str] = None  

class AITasksResponse(BaseModel):
    tasks: List[AIGeneratedTask]
    transcript_id: int

class TaskResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    status: TaskStatus
    priority: TaskPriority
    assigned_team: Team
    tags: Optional[str]
    transcript_id: int
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime]
    
    class Config:
        from_attributes = True

