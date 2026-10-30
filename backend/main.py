import asyncio
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import Float, Integer, String, DateTime, select, func

<<<<<<< HEAD
# 1. Database Connection Configuration (SQLAlchemy Async Driver)
DATABASE_URL = "mysql+aiomysql://root:@localhost:3306/portsync_twin"
=======
# 1. Database Connection Configuration (SQLAlchemy Async Driver with MySQL)
DATABASE_URL = "mysql+aiomysql://root:463165Shyam@localhost:3306/portsync_twin"
>>>>>>> 626cbb02320e193fd0dd87309c3ffd24946ad00e

engine = create_async_engine(DATABASE_URL, echo=False, future=True)
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

class Base(DeclarativeBase):
    pass

# SQLAlchemy ORM Model mapping to 'assets_telemetry'
class AssetTelemetryModel(Base):
    __tablename__ = "assets_telemetry"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    asset_id: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    speed: Mapped[float] = mapped_column(Float, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

# SQLAlchemy ORM Model mapping to 'container_inventory'
# Updated SQLAlchemy ORM Models matching your actual MySQL schema

class ContainerInventoryModel(Base):
    __tablename__ = "container_inventory"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    container_no: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    size: Mapped[str] = mapped_column(String(10), nullable=False, default="40ft")
    container_type: Mapped[str] = mapped_column(String(20), nullable=False, default="Standard")
    commodity: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    current_yard_block: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    temperature_celsius: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    stay_duration_hours: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="In Yard")


class PortGateLogModel(Base):
    __tablename__ = "port_gate_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    vehicle_no: Mapped[str] = mapped_column(String(32), index=True, nullable=False)
    gate_id: Mapped[str] = mapped_column(String(32), nullable=False, default="GATE-1")
    entry_time: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    exit_time: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="Processing")
# 2. Pydantic Validation Models
class TelemetryPacket(BaseModel):
    asset_id: str = Field(..., description="Unique alphanumeric identifier for the port asset")
    status: str = Field(..., description="Operational condition (e.g., active, docked, moving, idle)")
    latitude: float = Field(..., description="GPS Latitude coordinate")
    longitude: float = Field(..., description="GPS Longitude coordinate")
    speed: float = Field(..., description="Current speed metrics in knots or km/h")
    timestamp: Optional[datetime] = Field(default_factory=datetime.utcnow, description="Packet timestamp")

    class Config:
        from_attributes = True

# In-memory tracking state for simulation targets moving towards JNPT Port [18.9500, 72.9500]
JNPT_TARGET_LAT = 18.9500
JNPT_TARGET_LON = 72.9500

simulated_assets_state = {
    "Vessel MV-EverGlory": {"lat": 18.5200, "lon": 72.3000, "speed": 14.5, "status": "In Transit (Sea)"},
    "DFC-Train-99": {"lat": 18.2500, "lon": 72.6000, "speed": 65.0, "status": "On Rail Corridor"},
    "Truck-MH-04": {"lat": 18.4000, "lon": 72.7500, "speed": 42.0, "status": "Expressway Transit"}
}

# Background task loop to automatically generate and save live telemetry every 5 seconds
async def background_telemetry_simulator():
    while True:
        await asyncio.sleep(5)
        async with AsyncSessionLocal() as session:
            try:
                for asset_id, data in simulated_assets_state.items():
                    lat_diff = JNPT_TARGET_LAT - data["lat"]
                    lon_diff = JNPT_TARGET_LON - data["lon"]
                    
                    if abs(lat_diff) < 0.002 and abs(lon_diff) < 0.002:
                        if asset_id == "Vessel MV-EverGlory":
                            data["lat"], data["lon"] = 18.5200, 72.3000
                        elif asset_id == "DFC-Train-99":
                            data["lat"], data["lon"] = 18.2500, 72.6000
                        else:
                            data["lat"], data["lon"] = 18.4000, 72.7500
                    else:
                        data["lat"] += lat_diff * 0.08
                        data["lon"] += lon_diff * 0.08

                    db_record = AssetTelemetryModel(
                        asset_id=asset_id,
                        status=data["status"],
                        latitude=round(data["lat"], 6),
                        longitude=round(data["lon"], 6),
                        speed=data["speed"],
                        timestamp=datetime.utcnow()
                    )
                    session.add(db_record)
                
                await session.commit()
            except Exception as e:
                await session.rollback()
                print(f"Background simulation error: {e}")

# FastAPI Lifespan Manager
@asynccontextmanager
async def lifespan(app: FastAPI):
    sim_task = asyncio.create_task(background_telemetry_simulator())
    yield
    sim_task.cancel()
    try:
        await sim_task
    except asyncio.CancelledError:
        pass

# FastAPI Application Initialization
app = FastAPI(
    title="PortSync Twin Backend API",
    description="High-performance asynchronous backend for real-time port logistics digital twin[cite: 4].",
    version="2.1.0",
    lifespan=lifespan
)

# Enable CORS for Vite/React frontend running on port 5173
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency injection for database sessions
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

# High-Speed Asynchronous FastAPI Endpoint POST /api/telemetry
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

# High-Speed Asynchronous GET Endpoint /api/live-assets for React Map Canvas
@app.get("/api/live-assets", response_model=List[TelemetryPacket])
async def get_live_assets(db: AsyncSession = Depends(get_db)):
    try:
        subq = (
            select(
                AssetTelemetryModel.asset_id,
                func.max(AssetTelemetryModel.id).label("max_id")
            )
            .group_by(AssetTelemetryModel.asset_id)
            .subquery()
        )
        
        stmt = (
            select(AssetTelemetryModel)
            .join(subq, AssetTelemetryModel.id == subq.c.max_id)
        )
        
        result = await db.execute(stmt)
        records = result.scalars().all()
        
        return records
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch live asset telemetry: {str(e)}"
        )

# 3. National Stream Ingestion Endpoint handling multiple schema families securely
@app.post("/api/v1/ingest-national-stream", status_code=status.HTTP_201_CREATED)
async def ingest_national_stream(payload: Dict[str, Any], db: AsyncSession = Depends(get_db)):
    try:
        schema_family = payload.get("schema_family")
        if not schema_family:
            raise HTTPException(status_code=400, detail="Missing 'schema_family' tag in payload stream.")

        timestamp_str = payload.get("timestamp")
        packet_time = datetime.utcnow()
        if timestamp_str:
            try:
                packet_time = datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))
            except Exception:
                pass

        # Family 1: Vahan Commercial Vehicle Tracking -> assets_telemetry table
        if schema_family == "mock_vahan_commercial_vehicle":
            vehicle_data = payload.get("vehicle", {})
            trip_data = payload.get("trip", {})
            gps_data = trip_data.get("gps", {})

            registration_id = vehicle_data.get("registration_id", "UNKNOWN-VEHICLE")
            speed_kph = float(trip_data.get("speed_kph", 0.0) or 0.0)
            lat = float(gps_data.get("lat", 18.9500) or 18.9500)
            lon = float(gps_data.get("lon", 72.9500) or 72.9500)

            db_record = AssetTelemetryModel(
                asset_id=registration_id,
                status="National Highway Transit",
                latitude=lat,
                longitude=lon,
                speed=speed_kph,
                timestamp=packet_time
            )
            db.add(db_record)
            await db.commit()
            return {"status": "success", "schema_family": schema_family, "target": registration_id, "routed_to": "assets_telemetry"}

      # Family 2: LDB Container Cycle Tracking -> container_inventory table (with duplicate handling)
        elif schema_family == "mock_ldb_container_cycle":
            container_data = payload.get("container", {})
            reefer_data = container_data.get("reefer", {})

            # Truncate container_id to fit varchar(20) and avoid duplicates
            raw_id = container_data.get("container_id", "CONT-01")
            container_id = str(raw_id)[:20] 
            
            temperature_c = reefer_data.get("temperature_c")
            temp_val = float(temperature_c) if temperature_c is not None else None
            dwell_hours = container_data.get("dwell_hours")
            dwell_val = float(dwell_hours) if dwell_hours is not None else 0.0

            # Check if container already exists to avoid unique constraint 500 errors
            existing_stmt = select(ContainerInventoryModel).where(ContainerInventoryModel.container_no == container_id)
            existing_result = await db.execute(existing_stmt)
            db_record = existing_result.scalars().first()

            if db_record:
                db_record.temperature_celsius = temp_val
                db_record.stay_duration_hours = dwell_val
                db_record.timestamp = packet_time
            else:
                db_record = ContainerInventoryModel(
                    container_no=container_id,
                    size="40ft",
                    container_type="Reefer" if bool(reefer_data.get("enabled", False)) else "Standard",
                    commodity="GENERAL",
                    temperature_celsius=temp_val,
                    stay_duration_hours=dwell_val,
                    status="In Yard"
                )
                db.add(db_record)

            await db.commit()
            return {"status": "success", "schema_family": schema_family, "target": container_id, "routed_to": "container_inventory"}       
        # Family 3: FOIS Freight Movement Tracking -> port_gate_logs table
        elif schema_family == "mock_fois_freight_movement":
            freight_data = payload.get("freight_movement", {})

            train_id = freight_data.get("train_id", "TRAIN-UNKNOWN")
            delay_minutes = freight_data.get("delay_minutes")
            delay_val = int(delay_minutes) if delay_minutes is not None else 0

            db_record = PortGateLogModel(
                vehicle_no=train_id,
                gate_id="RAIL-GATE-1",
                status="Processing"
            )
            db.add(db_record)
            await db.commit()
            return {"status": "success", "schema_family": schema_family, "target": train_id, "routed_to": "port_gate_logs"}

        else:
            raise HTTPException(status_code=400, detail=f"Unrecognized schema_family: '{schema_family}'")

    except HTTPException as he:
        raise he
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process national stream packet: {str(e)}"
        )