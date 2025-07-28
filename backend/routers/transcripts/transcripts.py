from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, or_, delete
from sqlalchemy.orm import joinedload
from typing import List, Optional
import io
from config import get_db
from models import User, Transcript, Task, TaskStatus
from routers.auth.helpers import get_current_active_user
from .schemas import (
    TranscriptCreate, 
    TranscriptResponse, 
    TranscriptUpdate,
    AITasksResponse,
    TaskResponse,

)
from .helpers import extract_tasks_and_summary_from_transcript
from .file_storage import FileStorageHelper
import logging
from datetime import datetime
import uuid

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/transcripts", tags=["Transcripts"])


@router.post("/", response_model=TranscriptResponse, status_code=status.HTTP_201_CREATED)
async def create_transcript(
    transcript_data: TranscriptCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new transcript with manual entry and automatic AI processing"""
    
    try:
        new_transcript = Transcript(
            title=transcript_data.title,
            content=transcript_data.content,
            created_by_id=current_user.id
        )
        
        db.add(new_transcript)
        await db.commit()
        await db.refresh(new_transcript)

        try:
            file_path = FileStorageHelper.generate_file_path(
                user_id=current_user.id,
                original_filename=f"{transcript_data.title}.txt",
                transcript_id=new_transcript.id
            )

            file_content = f"""Title: {transcript_data.title}
Created by: {current_user.first_name} {current_user.last_name}
Created at: {new_transcript.created_at}
Team: {current_user.team.value}

---TRANSCRIPT CONTENT---
{transcript_data.content}
"""
            
            storage_path = await FileStorageHelper.upload_text_as_file(file_content, file_path)
            
            new_transcript.storage_file_path = storage_path
            new_transcript.original_filename = f"{transcript_data.title}.txt"
            new_transcript.file_size = len(file_content.encode('utf-8'))
            
        except Exception as e:
            logger.warning(f"Failed to store file for transcript {new_transcript.id}: {e}")
        
        try:
            ai_tasks, summary, sentiment = await extract_tasks_and_summary_from_transcript(
                transcript_data.content, 
                transcript_data.title
            )
            
            new_transcript.summary = summary
            new_transcript.sentiment = sentiment
            
            for ai_task in ai_tasks:
                task = Task(
                    title=ai_task.title,
                    description=ai_task.description,
                    priority=ai_task.priority,
                    assigned_team=ai_task.assigned_team,
                    tags=ai_task.tags,
                    transcript_id=new_transcript.id
                )
                db.add(task)
            
            await db.commit()
            await db.refresh(new_transcript)
            
            logger.info(f"Created transcript {new_transcript.id} with {len(ai_tasks)} AI-generated tasks and summary")
            
        except Exception as e:
            logger.error(f"AI processing failed for transcript {new_transcript.id}: {e}")

        return new_transcript
        
    except Exception as e:
        await db.rollback()
        logger.error(f"Error creating transcript: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create transcript: {str(e)}"
        )

@router.post("/upload", response_model=TranscriptResponse, status_code=status.HTTP_201_CREATED)
async def upload_transcript_file(
    file: UploadFile = File(...),
    title: str = Form(...),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Upload a transcript file (.txt) and automatically process with AI"""

    if not file.filename.endswith('.txt'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only .txt files are allowed"
        )

    MAX_FILE_SIZE = 10 * 1024 * 1024 
    file_content = await file.read()
    if len(file_content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size too large. Maximum 10MB allowed."
        )
    
    try:
        content = file_content.decode('utf-8')
        new_transcript = Transcript(
            title=title,
            content=content,
            original_filename=file.filename,
            file_size=len(file_content),
            created_by_id=current_user.id
        )
        
        db.add(new_transcript)
        await db.commit()
        await db.refresh(new_transcript)

        try:
            file_path = FileStorageHelper.generate_file_path(
                user_id=current_user.id,
                original_filename=file.filename,
                transcript_id=new_transcript.id
            )
            
            storage_path = await FileStorageHelper.upload_file(file_content, file_path)
            new_transcript.storage_file_path = storage_path
            
        except Exception as e:
            logger.warning(f"Failed to store uploaded file for transcript {new_transcript.id}: {e}")

        try:
            ai_tasks, summary, sentiment = await extract_tasks_and_summary_from_transcript(content, title)
            new_transcript.summary = summary
            new_transcript.sentiment = sentiment
            for ai_task in ai_tasks:
                task = Task(
                    title=ai_task.title,
                    description=ai_task.description,
                    priority=ai_task.priority,
                    assigned_team=ai_task.assigned_team,
                    tags=ai_task.tags,
                    transcript_id=new_transcript.id
                )
                db.add(task)
            
            await db.commit()
            await db.refresh(new_transcript)
            
            logger.info(f"Uploaded and processed transcript {new_transcript.id} with {len(ai_tasks)} AI-generated tasks")
            
        except Exception as e:
            logger.error(f"AI processing failed for uploaded transcript {new_transcript.id}: {e}")
        
        return new_transcript
        
    except UnicodeDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be a valid UTF-8 encoded text file"
        )
    except Exception as e:
        await db.rollback()
        logger.error(f"Error uploading transcript: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload transcript: {str(e)}"
        )

@router.post("/{transcript_id}/generate-tasks", response_model=AITasksResponse)
async def generate_tasks_from_transcript(
    transcript_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Generate AI tasks from transcript content"""

    result = await db.execute(select(Transcript).where(Transcript.id == transcript_id))
    transcript = result.scalar_one_or_none()
    
    if not transcript:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transcript not found"
        )
    
    try:
        ai_tasks, summary, sentiment = await extract_tasks_and_summary_from_transcript(transcript.content, transcript.title)
        transcript.summary = summary
        transcript.sentiment = sentiment
        created_tasks = []
        for ai_task in ai_tasks:
            task = Task(
                title=ai_task.title,
                description=ai_task.description,
                priority=ai_task.priority,
                assigned_team=ai_task.assigned_team,
                tags=ai_task.tags,
                transcript_id=transcript_id
            )
            db.add(task)
            created_tasks.append(ai_task)
        
        await db.commit()
        
        logger.info(f"Generated {len(created_tasks)} tasks for transcript {transcript_id}")
        return AITasksResponse(tasks=created_tasks, transcript_id=transcript_id)
        
    except Exception as e:
        logger.error(f"Error generating tasks: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate tasks: {str(e)}"
        )

@router.get("/", response_model=List[TranscriptResponse])
async def get_transcripts(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all transcripts (shared workspace)"""
    
    result = await db.execute(
        select(Transcript)
        .order_by(Transcript.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    transcripts = result.scalars().all()
    
    return transcripts

@router.get("/{transcript_id}", response_model=TranscriptResponse)
async def get_transcript(
    transcript_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific transcript"""
    
    result = await db.execute(select(Transcript).where(Transcript.id == transcript_id))
    transcript = result.scalar_one_or_none()
    
    if not transcript:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transcript not found"
        )
    
    return transcript

@router.put("/{transcript_id}", response_model=TranscriptResponse)
async def update_transcript(
    transcript_id: int,
    transcript_update: TranscriptUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a transcript"""
    
    result = await db.execute(select(Transcript).where(Transcript.id == transcript_id))
    transcript = result.scalar_one_or_none()
    
    if not transcript:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transcript not found"
        )

    if transcript_update.title is not None:
        transcript.title = transcript_update.title
    if transcript_update.content is not None:
        transcript.content = transcript_update.content
    
    await db.commit()
    await db.refresh(transcript)
    
    logger.info(f"Transcript {transcript_id} updated by user {current_user.email}")
    return transcript

@router.delete("/{transcript_id}")
async def delete_transcript(
    transcript_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a transcript and all its tasks"""
    
    result = await db.execute(select(Transcript).where(Transcript.id == transcript_id))
    transcript = result.scalar_one_or_none()
    
    if not transcript:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transcript not found"
        )
    
    await db.execute(delete(Task).where(Task.transcript_id == transcript_id))
    await db.delete(transcript)
    await db.commit()
    
    logger.info(f"Transcript {transcript_id} deleted by user {current_user.email}")
    return {"message": "Transcript deleted successfully"}

@router.get("/{transcript_id}/tasks", response_model=List[TaskResponse])
async def get_transcript_tasks(
    transcript_id: int,
    my_team_only: bool = Query(False, description="Filter tasks for user's team only"),
    status_filter: Optional[TaskStatus] = Query(None, description="Filter by task status"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Get tasks for a specific transcript"""

    result = await db.execute(select(Transcript).where(Transcript.id == transcript_id))
    transcript = result.scalar_one_or_none()
    
    if not transcript:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transcript not found"
        )

    query = select(Task).where(Task.transcript_id == transcript_id)

    if my_team_only:
        query = query.where(Task.assigned_team == current_user.team)

    if status_filter:
        query = query.where(Task.status == status_filter)
    
    query = query.order_by(Task.created_at.desc())
    
    result = await db.execute(query)
    tasks = result.scalars().all()
    
    return tasks

@router.get("/{transcript_id}/download")
async def download_transcript_file(
    transcript_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Download the original transcript file"""

    result = await db.execute(select(Transcript).where(Transcript.id == transcript_id))
    transcript = result.scalar_one_or_none()
    
    if not transcript:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transcript not found"
        )
    
    if not transcript.storage_file_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No file associated with this transcript"
        )
    
    try:
        file_content = await FileStorageHelper.download_file(transcript.storage_file_path)
        file_stream = io.BytesIO(file_content)
        filename = transcript.original_filename or f"transcript_{transcript_id}.txt"
        
        return StreamingResponse(
            io.BytesIO(file_content),
            media_type="text/plain",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    except Exception as e:
        logger.error(f"Error downloading file for transcript {transcript_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to download file"
        )
