import uuid
import logging
from datetime import datetime
from typing import Optional
from fastapi import UploadFile
from config import get_supabase_storage, SUPABASE_STORAGE_BUCKET

logger = logging.getLogger(__name__)

class FileStorageHelper:
    """Helper class for managing file storage in Supabase"""
    
    @staticmethod
    def generate_file_path(user_id: int, original_filename: str, transcript_id: Optional[int] = None) -> str:
        """Generate a unique file path for storage"""
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        unique_id = str(uuid.uuid4())[:8]
        clean_filename = original_filename.replace(" ", "_").replace("/", "_")
        
        if transcript_id:
            return f"transcripts/user_{user_id}/transcript_{transcript_id}_{timestamp}_{unique_id}_{clean_filename}"
        else:
            return f"transcripts/user_{user_id}/{timestamp}_{unique_id}_{clean_filename}"
    
    @staticmethod
    async def upload_file(file_content: bytes, file_path: str) -> str:
        """Upload file to Supabase Storage and return the storage path"""
        try:
            storage = get_supabase_storage()

            result = storage.from_(SUPABASE_STORAGE_BUCKET).upload(
                path=file_path,
                file=file_content,
                file_options={"content-type": "text/plain"}
            )
            
            if hasattr(result, 'error') and result.error:
                raise Exception(f"Upload failed: {result.error}")
            
            logger.info(f"File uploaded successfully to: {file_path}")
            return file_path
            
        except Exception as e:
            logger.error(f"Error uploading file: {e}")
            raise Exception(f"Failed to upload file: {str(e)}")
    
    @staticmethod
    async def upload_text_as_file(content: str, file_path: str) -> str:
        """Upload text content as a .txt file to Supabase Storage incase the user copy pastes the transcript"""
        try:
            file_content = content.encode('utf-8')
            return await FileStorageHelper.upload_file(file_content, file_path)
        except Exception as e:
            logger.error(f"Error uploading text as file: {e}")
            raise Exception(f"Failed to upload text as file: {str(e)}")
    
    @staticmethod
    async def download_file(file_path: str) -> bytes:
        """Download file"""
        try:
            storage = get_supabase_storage()
            
            result = storage.from_(SUPABASE_STORAGE_BUCKET).download(file_path)
            
            if hasattr(result, 'error') and result.error:
                raise Exception(f"Download failed: {result.error}")
            
            return result
            
        except Exception as e:
            logger.error(f"Error downloading file: {e}")
            raise Exception(f"Failed to download file: {str(e)}")
    
    @staticmethod
    async def delete_file(file_path: str) -> bool:
        """Delete file from Supabase Bucket"""
        try:
            storage = get_supabase_storage()
            
            result = storage.from_(SUPABASE_STORAGE_BUCKET).remove([file_path])
            
            if hasattr(result, 'error') and result.error:
                logger.warning(f"Delete warning: {result.error}")
                return False
            
            logger.info(f"File deleted successfully: {file_path}")
            return True
            
        except Exception as e:
            logger.error(f"Error deleting file: {e}")
            return False
    
    @staticmethod
    def get_public_url(file_path: str) -> str:
        """Get public URL for the file"""
        try:
            storage = get_supabase_storage()
            result = storage.from_(SUPABASE_STORAGE_BUCKET).get_public_url(file_path)
            return result
        except Exception as e:
            logger.error(f"Error getting public URL: {e}")
            return ""
