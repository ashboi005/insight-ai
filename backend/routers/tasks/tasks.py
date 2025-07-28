from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, desc
from typing import List, Optional
from config import get_db
from models import User, Task, TaskStatus, TaskPriority, Team
from routers.auth.helpers import get_current_active_user
from .schemas import TaskUpdate, TaskResponse, TaskAnalyticsResponse, TaskStatsResponse, TeamStatsResponse
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tasks", tags=["Tasks"])

@router.get("/", response_model=List[TaskResponse])
async def get_tasks(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    my_team_only: bool = Query(False, description="Filter tasks for user's team only"),
    status_filter: Optional[TaskStatus] = Query(None, description="Filter by task status"),
    priority_filter: Optional[TaskPriority] = Query(None, description="Filter by priority"),
    search: Optional[str] = Query(None, description="Search in title and description"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Get tasks with filtering options"""
    
    query = select(Task)

    if my_team_only:
        query = query.where(Task.assigned_team == current_user.team)

    if status_filter:
        query = query.where(Task.status == status_filter)
    
    if priority_filter:
        query = query.where(Task.priority == priority_filter)
    
    if search:
        search_term = f"%{search}%"
        query = query.where(
            Task.title.ilike(search_term) | 
            Task.description.ilike(search_term) |
            Task.tags.ilike(search_term)
        )
    
    query = query.order_by(desc(Task.created_at)).offset(skip).limit(limit)
    
    result = await db.execute(query)
    tasks = result.scalars().all()
    
    return tasks

@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific task"""
    
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    return task

@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: int,
    task_update: TaskUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a task"""
    
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )

    if task_update.title is not None:
        task.title = task_update.title
    if task_update.description is not None:
        task.description = task_update.description
    if task_update.status is not None:
        task.status = task_update.status
    if task_update.priority is not None:
        task.priority = task_update.priority
    if task_update.assigned_team is not None:
        task.assigned_team = task_update.assigned_team
    if task_update.tags is not None:
        task.tags = task_update.tags
    
    await db.commit()
    await db.refresh(task)
    
    logger.info(f"Task {task_id} updated by user {current_user.email}")
    return task

@router.delete("/{task_id}")
async def delete_task(
    task_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a task"""
    
    result = await db.execute(select(Task).where(Task.id == task_id))
    task = result.scalar_one_or_none()
    
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    
    await db.delete(task)
    await db.commit()
    
    logger.info(f"Task {task_id} deleted by user {current_user.email}")
    return {"message": "Task deleted successfully"}

@router.get("/analytics/dashboard", response_model=TaskAnalyticsResponse)
async def get_task_analytics(
    my_team_only: bool = Query(False, description="Get analytics for user's team only"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Get comprehensive task analytics for dashboard"""
    
    base_filter = []
    if my_team_only:
        base_filter.append(Task.assigned_team == current_user.team)
    

    total_tasks_query = select(func.count(Task.id))
    if base_filter:
        total_tasks_query = total_tasks_query.where(and_(*base_filter))
    
    completed_tasks_query = select(func.count(Task.id)).where(Task.status == TaskStatus.COMPLETED)
    pending_tasks_query = select(func.count(Task.id)).where(Task.status == TaskStatus.PENDING)
    in_progress_tasks_query = select(func.count(Task.id)).where(Task.status == TaskStatus.IN_PROGRESS)
    
    high_priority_query = select(func.count(Task.id)).where(Task.priority == TaskPriority.HIGH)
    medium_priority_query = select(func.count(Task.id)).where(Task.priority == TaskPriority.MEDIUM)
    low_priority_query = select(func.count(Task.id)).where(Task.priority == TaskPriority.LOW)
    
    if base_filter:
        completed_tasks_query = completed_tasks_query.where(and_(*base_filter))
        pending_tasks_query = pending_tasks_query.where(and_(*base_filter))
        in_progress_tasks_query = in_progress_tasks_query.where(and_(*base_filter))
        high_priority_query = high_priority_query.where(and_(*base_filter))
        medium_priority_query = medium_priority_query.where(and_(*base_filter))
        low_priority_query = low_priority_query.where(and_(*base_filter))
    
    total_tasks = (await db.execute(total_tasks_query)).scalar() or 0
    completed_tasks = (await db.execute(completed_tasks_query)).scalar() or 0
    pending_tasks = (await db.execute(pending_tasks_query)).scalar() or 0
    in_progress_tasks = (await db.execute(in_progress_tasks_query)).scalar() or 0
    
    high_priority = (await db.execute(high_priority_query)).scalar() or 0
    medium_priority = (await db.execute(medium_priority_query)).scalar() or 0
    low_priority = (await db.execute(low_priority_query)).scalar() or 0
    
    completion_rate = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
    
    overall_stats = TaskStatsResponse(
        total_tasks=total_tasks,
        completed_tasks=completed_tasks,
        pending_tasks=pending_tasks,
        in_progress_tasks=in_progress_tasks,
        high_priority=high_priority,
        medium_priority=medium_priority,
        low_priority=low_priority,
        completion_rate=round(completion_rate, 2)
    )
    
    team_breakdown = []
    if not my_team_only:
        for team in Team:
            team_total_query = select(func.count(Task.id)).where(Task.assigned_team == team)
            team_completed_query = select(func.count(Task.id)).where(
                and_(Task.assigned_team == team, Task.status == TaskStatus.COMPLETED)
            )
            
            team_total = (await db.execute(team_total_query)).scalar() or 0
            team_completed = (await db.execute(team_completed_query)).scalar() or 0
            team_completion_rate = (team_completed / team_total * 100) if team_total > 0 else 0
            
            team_breakdown.append(TeamStatsResponse(
                team=team.value,
                total_tasks=team_total,
                completed_tasks=team_completed,
                completion_rate=round(team_completion_rate, 2)
            ))
    
    recent_query = select(Task).order_by(desc(Task.updated_at)).limit(10)
    if base_filter:
        recent_query = recent_query.where(and_(*base_filter))
    
    recent_result = await db.execute(recent_query)
    recent_activity = recent_result.scalars().all()
    
    return TaskAnalyticsResponse(
        overall_stats=overall_stats,
        team_breakdown=team_breakdown,
        recent_activity=recent_activity
    )
