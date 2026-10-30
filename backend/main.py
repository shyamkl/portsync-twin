from datetime import datetime
from typing import Optional
from fastapi import FastAPI, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import Float, Integer, String, DateTime

# 1. Database Connection Configuration (SQLAlchemy Async Driver)
DATABASE_URL = "mysql+aiomysql://root:@localhost:3306/portsync_twin"

engine = create_async_engine(DATABASE_URL, echo=True, future=True)
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

class Base(DeclarativeBase):
    pass

# SQLAlchemy ORM Model mapping to the 'assets_telemetry' table
class AssetTelemetryModel(Base):
    __tablename__ = "assets_telemetry"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    asset_id: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    speed: Mapped[float] = mapped_column(Float, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

# 2. Pydantic Validation Model for Real-Time Tracking Data Packet
class TelemetryPacket(BaseModel):
    asset_id: str = Field(..., description="Unique alphanumeric identifier for the port asset")
    status: str = Field(..., description="Operational condition (e.g., active, docked, moving, idle)")
    latitude: float = Field(..., description="GPS Latitude coordinate")
    longitude: float = Field(..., description="GPS Longitude coordinate")
    speed: float = Field(..., description="Current speed metrics in knots")
    timestamp: Optional[datetime] = Field(default_factory=datetime.utcnow, description="Packet timestamp")

    class Config:
        from_attributes = True

# FastAPI Application Initialization[cite: 1]
app = FastAPI(
    title="PortSync Twin Backend API",
    description="High-performance asynchronous backend for real-time port logistics digital twin[cite: 1].",
    version="1.0.0"
)

# Dependency injection for safe, non-blocking asynchronous database sessions
async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

# 3. High-Speed Asynchronous FastAPI Endpoint POST /api/telemetry
@app.post("/api/telemetry", status_code=status.HTTP_201_CREATED)
async def ingest_telemetry(packet: TelemetryPacket, db: AsyncSession = Depends(get_db)):
    try:
        db_record = AssetTelemetryModel(
            asset_id=packet.asset_id,
            status=packet.status,
            latitude=packet.latitude,
            longitude=packet.longitude,
            speed=packet.speed,
            timestamp=packet.timestamp
        )
        
        db.add(db_record)
        await db.flush()
        await db.refresh(db_record)
        
        return {
            "status": "success",
            "message": "Telemetry record successfully ingested and stored.",
            "data": {
                "id": db_record.id,
                "asset_id": db_record.asset_id,
                "timestamp": db_record.timestamp.isoformat()
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database write failed for telemetry packet: {str(e)}"
        )