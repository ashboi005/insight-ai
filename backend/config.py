import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from models import Base
from supabase import create_client, Client
import logging

#logger is added if needed to check if env variables are working or not
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

#configure env variables
AWS_REGION = os.getenv("AWS_REGION", "ap-south-1")
DATABASE_URL = os.getenv("DATABASE_URL")
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY")
JWT_ALGORITHM = "HS256"
JWT_ACCESS_TOKEN_EXPIRE_MINUTES = 30
JWT_REFRESH_TOKEN_EXPIRE_DAYS = 7

# Supabase for file storage only
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
SUPABASE_STORAGE_BUCKET = os.getenv("SUPABASE_STORAGE_BUCKET", "insight-ai")

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

_supabase_storage_client = None

def get_supabase_storage_client() -> Client:
    """Get Supabase client for file storage operations only"""
    global _supabase_storage_client
    if _supabase_storage_client is None:
        if not SUPABASE_URL or not SUPABASE_SERVICE_ROLE_KEY:
            raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for file storage")
        
        _supabase_storage_client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    return _supabase_storage_client

def get_supabase_storage():
    """Get Supabase storage client for file operations"""
    client = get_supabase_storage_client()
    return client.storage

if DATABASE_URL:
    sync_engine = create_engine(DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://"))    
    asyncpg_url = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")
    
    if "?" in asyncpg_url:
        base_url = asyncpg_url.split("?")[0]
    else:
        base_url = asyncpg_url
    
    asyncpg_url = f"{base_url}?prepared_statement_cache_size=0"
    
    try:
        async_engine = create_async_engine(
            asyncpg_url,
            echo=False,
            pool_pre_ping=False, 
            pool_size=5,
            max_overflow=0
        )
    except Exception as e:
        logger.critical(f"FATAL: Failed to create SQLAlchemy engine: {e}", exc_info=True)
        raise
    
    AsyncSessionLocal = sessionmaker(
        bind=async_engine,
        class_=AsyncSession,
        expire_on_commit=False
    )
    
    #for migrations we need sync session
    from sqlalchemy.orm import sessionmaker as sync_sessionmaker
    SyncSessionLocal = sync_sessionmaker(
        bind=sync_engine,
        expire_on_commit=False
    )
    try:
        AsyncSessionFactory = sessionmaker(
            bind=async_engine,
            class_=AsyncSession,
            expire_on_commit=False
        )
    except Exception as e:
        logger.critical(f"FATAL: Failed to create SQLAlchemy session factory: {e}", exc_info=True)
        raise
else:
    sync_engine = None
    async_engine = None
    AsyncSessionLocal = None
    SyncSessionLocal = None

def get_sync_db():
    """Synchronous database session for migrations"""
    if SyncSessionLocal is None:
        raise Exception("Sync database not configured")
    db = SyncSessionLocal()
    try:
        yield db
    finally:
        db.close()

async def get_db():
    if AsyncSessionLocal is None:
        raise Exception("Database not configured")
    async with AsyncSessionLocal() as session:
        yield session

async def init_db():
    if async_engine is None:
        raise Exception("Database not configured")
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

def get_sync_engine():
    if sync_engine is None:
        raise Exception("Database not configured")
    return sync_engine

ENVIRONMENT = os.getenv("ENVIRONMENT", "dev")
DEBUG = ENVIRONMENT == "dev"
