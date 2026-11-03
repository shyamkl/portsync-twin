import asyncio
import os
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from contextlib import asynccontextmanager

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import (
    create_async_engine,
    AsyncSession,
    async_sessionmaker,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import Float, Integer, String, DateTime, select, func

# WebSocket alert router integration
from routers.alert_router import alert_router, publish_ldb_event
from routers.analytics_router import analytics_router, analytics_manager
#from services.gate_analytics import get_gate_analytics

# 1. Database connection configuration with your active MySQL credentials
#DATABASE_URL = os.getenv(
#    "PORTSYNC_DATABASE_URL",
#    "mysql+aiomysql://root:463165Shyam@localhost:3306/portsync_twin",
#)

DATABASE_URL = os.getenv(
    "PORTSYNC_DATABASE_URL",
    "mysql+aiomysql://root:@localhost:3306/portsync_twin",
)

engine = create_async_engine(DATABASE_URL, echo=False, future=True)
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


# SQLAlchemy ORM model: assets_telemetry
class AssetTelemetryModel(Base):
    __tablename__ = "assets_telemetry"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    asset_id: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    speed: Mapped[float] = mapped_column(Float, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )


# SQLAlchemy ORM model: container_inventory
class ContainerInventoryModel(Base):
    __tablename__ = "container_inventory"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    container_no: Mapped[str] = mapped_column(
        String(20), unique=True, index=True, nullable=False
    )
    size: Mapped[str] = mapped_column(String(10), nullable=False, default="40ft")
    container_type: Mapped[str] = mapped_column(
        String(20), nullable=False, default="Standard"
    )
    commodity: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    current_yard_block: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    temperature_celsius: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    stay_duration_hours: Mapped[float] = mapped_column(
        Float, nullable=False, default=0.0
    )
    status: Mapped[str] = mapped_column(
        String(32), nullable=False, default="In Yard"
    )


# SQLAlchemy ORM model: port_gate_logs
class PortGateLogModel(Base):
    __tablename__ = "port_gate_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    vehicle_no: Mapped[str] = mapped_column(String(32), index=True, nullable=False)
    gate_id: Mapped[str] = mapped_column(String(32), nullable=False, default="GATE-1")
    entry_time: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    exit_time: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="Processing")


# 2. Pydantic validation model
class TelemetryPacket(BaseModel):
    asset_id: str = Field(
        ..., description="Unique alphanumeric identifier for the port asset"
    )
    status: str = Field(
        ..., description="Operational condition (e.g., active, docked, moving, idle)"
    )
    latitude: float = Field(..., description="GPS latitude coordinate")
    longitude: float = Field(..., description="GPS longitude coordinate")
    speed: float = Field(..., description="Current speed in knots or km/h")
    timestamp: Optional[datetime] = Field(
        default_factory=datetime.utcnow, description="Packet timestamp"
    )

    class Config:
        from_attributes = True


# Pydantic model for Simulation Disruption Toggle requests
class SimulationToggleRequest(BaseModel):
    disruption_key: str = Field(..., description="Key of the disruption: customs_outage, rail_maintenance, gate_slowdown")
    state: bool = Field(..., description="Boolean activation state")


# Global In-Memory State Dictionary for Stage 2 "What-If" Crisis Disruption Toggles
simulation_disruptions_state = {
    "customs_outage": False,
    "rail_maintenance": False,
    "gate_slowdown": False
}


# In-memory simulation targets moving towards JNPT Port [18.9500, 72.9500].
JNPT_TARGET_LAT = 18.9500
JNPT_TARGET_LON = 72.9500

simulated_assets_state = {
    "Vessel MV-EverGlory": {
        "lat": 18.5200, "lon": 72.3000, "speed": 14.5,
        "status": "In Transit (Sea)",
    },
    "DFC-Train-99": {
        "lat": 18.2500, "lon": 72.6000, "speed": 65.0,
        "status": "On Rail Corridor",
    },
    "Truck-MH-04": {
        "lat": 18.4000, "lon": 72.7500, "speed": 42.0,
        "status": "Expressway Transit",
    },
}

# In-memory state for simulated truck gate processing
truck_gate_simulation_state = {
    "active_gate_log_id": None,
    "entry_time": None,
    "processing_minutes_normal": 2,
    "processing_minutes_slowdown": 8,
}

async def process_simulated_truck_gate(session: AsyncSession):
    """Simulate repeated gate visits for Truck-MH-04."""

    state = truck_gate_simulation_state
    now = datetime.utcnow()

    # Check whether the truck already has an active gate visit.
    if state["active_gate_log_id"] is None:

        gate_log = PortGateLogModel(
            vehicle_no="Truck-MH-04",
            gate_id="GATE-1",
            entry_time=now,
            exit_time=None,
            status="Processing",
        )

        session.add(gate_log)
        await session.flush()

        state["active_gate_log_id"] = gate_log.id
        state["entry_time"] = now

        return

    # Determine processing duration based on gate slowdown.
    if simulation_disruptions_state["gate_slowdown"]:
        processing_minutes = state["processing_minutes_slowdown"]
    else:
        processing_minutes = state["processing_minutes_normal"]

    elapsed_minutes = (
        now - state["entry_time"]
    ).total_seconds() / 60

    # Complete the gate visit when its processing duration expires.
    if elapsed_minutes >= processing_minutes:

        gate_log = await session.get(
            PortGateLogModel,
            state["active_gate_log_id"],
        )

        if gate_log is not None:
            gate_log.exit_time = now
            gate_log.status = "Completed"

        # Reset state so the next visit can begin.
        state["active_gate_log_id"] = None
        state["entry_time"] = None

# Background task: generate and save simulated telemetry every 5 seconds.
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

                    # Apply global simulation disruption overrides if active
                    current_speed = data["speed"]
                    current_status = data["status"]
                    if simulation_disruptions_state["gate_slowdown"] and "Truck" in asset_id:
                        current_speed = 0.0
                        current_status = "CONGESTED_GRIDLOCK"

                    db_record = AssetTelemetryModel(
                        asset_id=asset_id,
                        status=current_status,
                        latitude=round(data["lat"], 6),
                        longitude=round(data["lon"], 6),
                        speed=current_speed,
                        timestamp=datetime.utcnow(),
                    )
                    session.add(db_record)

                # Process simulated truck gate entry and exit.
                await process_simulated_truck_gate(session)
                await session.commit()
            except Exception as e:
                await session.rollback()
                print(f"Background simulation error: {e}")


async def background_analytics_publisher():
    """Periodically broadcast live gate analytics to WebSocket clients."""
    from services.gate_analytics import get_gate_analytics

    while True:
        try:
            async with AsyncSessionLocal() as session:
                analytics = await get_gate_analytics(session)

            await analytics_manager.broadcast(analytics)

        except asyncio.CancelledError:
            raise
        except Exception as exc:
            print(f"Analytics publisher error: {exc}")

        await asyncio.sleep(5)


# FastAPI lifespan manager.

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create database tables from the existing SQLAlchemy models
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Start the existing background telemetry simulator
    sim_task = asyncio.create_task(background_telemetry_simulator())

    # Start the live analytics WebSocket publisher
    analytics_task = asyncio.create_task(background_analytics_publisher())

    try:
        yield
    finally:
        # Stop both background tasks
        sim_task.cancel()
        analytics_task.cancel()

        for task in (sim_task, analytics_task):
            try:
                await task
            except asyncio.CancelledError:
                pass

        await engine.dispose()


# FastAPI application initialization.
app = FastAPI(
    title="PortSync Twin Backend API",
    description=(
        "High-performance asynchronous backend for real-time "
        "port logistics digital twin."
    ),
    version="2.5.0",
    lifespan=lifespan,
)

# Enable CORS for Vite/React frontend running on port 5173.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register WebSocket Alert Router.
app.include_router(alert_router)

# Register Live Analytics Router.
app.include_router(analytics_router)

# Database session dependency.
async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

# GET /api/v1/analytics/summary
@app.get("/api/v1/analytics/summary")
async def analytics_summary(
    db: AsyncSession = Depends(get_db),
):
    from services.gate_analytics import get_gate_analytics
    return await get_gate_analytics(db)            


# POST /api/v1/simulation/toggle - Stage 2 Crisis Disruption Control Endpoint
@app.post("/api/v1/simulation/toggle", status_code=status.HTTP_200_OK)
async def toggle_simulation_disruption(payload: SimulationToggleRequest):
    key = payload.disruption_key
    state = payload.state

    if key not in simulation_disruptions_state:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid disruption key: '{key}'. Valid options are: {list(simulation_disruptions_state.keys())}"
        )

    simulation_disruptions_state[key] = state
    return {
        "status": "success",
        "disruption_key": key,
        "state": state,
        "current_disruptions": simulation_disruptions_state
    }


# POST /api/telemetry
@app.post("/api/telemetry", status_code=status.HTTP_201_CREATED)
async def ingest_telemetry(
    packet: TelemetryPacket,
    db: AsyncSession = Depends(get_db),
):
    try:
        db_record = AssetTelemetryModel(
            asset_id=packet.asset_id,
            status=packet.status,
            latitude=packet.latitude,
            longitude=packet.longitude,
            speed=packet.speed,
            timestamp=packet.timestamp,
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
                "timestamp": db_record.timestamp.isoformat(),
            },
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database write failed for telemetry packet: {str(e)}",
        )


# GET /api/live-assets for React map canvas.
@app.get("/api/live-assets", response_model=List[TelemetryPacket])
async def get_live_assets(db: AsyncSession = Depends(get_db)):
    try:
        subq = (
            select(
                AssetTelemetryModel.asset_id,
                func.max(AssetTelemetryModel.id).label("max_id"),
            )
            .group_by(AssetTelemetryModel.asset_id)
            .subquery()
        )
        stmt = (
            select(AssetTelemetryModel)
            .join(subq, AssetTelemetryModel.id == subq.c.max_id)
        )
        result = await db.execute(stmt)
        return result.scalars().all()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch live asset telemetry: {str(e)}",
        )


# Core shared processing function for incoming national stream packets with Disruption Interception
async def process_national_stream_payload(payload: Dict[str, Any], db: AsyncSession):
    schema_family = payload.get("schema_family")
    if not schema_family:
        raise HTTPException(
            status_code=400,
            detail="Missing 'schema_family' tag in payload stream.",
        )

    timestamp_str = payload.get("timestamp")
    packet_time = datetime.utcnow()
    if timestamp_str:
        try:
            packet_time = datetime.fromisoformat(
                timestamp_str.replace("Z", "+00:00")
            )
            if packet_time.tzinfo is not None:
                packet_time = packet_time.astimezone(
                    timezone.utc
                ).replace(tzinfo=None)
        except (TypeError, ValueError):
            pass

    # Family 1: Vahan vehicle tracking -> assets_telemetry (Interception for Gate Slowdown)
    if schema_family == "mock_vahan_commercial_vehicle":
        vehicle_data = payload.get("vehicle", {})
        trip_data = payload.get("trip", {})
        gps_data = trip_data.get("gps", {})

        registration_id = vehicle_data.get(
            "registration_id", "UNKNOWN-VEHICLE"
        )
        speed_kph = float(trip_data.get("speed_kph", 0.0) or 0.0)
        lat = float(gps_data.get("lat", 18.9500) or 18.9500)
        lon = float(gps_data.get("lon", 72.9500) or 72.9500)
        status_str = "National Highway Transit"

        # Apply gate_slowdown disruption override if active
        if simulation_disruptions_state["gate_slowdown"]:
            speed_kph = 0.0
            status_str = "CONGESTED_GRIDLOCK"

        db_record = AssetTelemetryModel(
            asset_id=registration_id,
            status=status_str,
            latitude=lat,
            longitude=lon,
            speed=speed_kph,
            timestamp=packet_time,
        )
        db.add(db_record)
        await db.commit()
        return {
            "status": "success",
            "schema_family": schema_family,
            "target": registration_id,
            "routed_to": "assets_telemetry",
            "disruptions_active": simulation_disruptions_state
        }

    # Family 2: LDB container cycle -> container_inventory (Interception for Customs Outage)
    elif schema_family == "mock_ldb_container_cycle":
        container_data = payload.get("container", {})
        reefer_data = container_data.get("reefer") or {}

        raw_id = container_data.get("container_id", "CONT-01")
        container_id = str(raw_id)[:20]

        temperature_c = reefer_data.get("temperature_c")
        temp_val = (
            float(temperature_c) if temperature_c is not None else None
        )
        dwell_hours = container_data.get("dwell_hours")
        dwell_val = float(dwell_hours) if dwell_hours is not None else 0.0
        container_status = "In Yard"

        # Apply customs_outage disruption override (multiply dwell hours by 5.0 and flag status)
        if simulation_disruptions_state["customs_outage"]:
            dwell_val *= 5.0
            container_status = "CUSTOMS_HOLD_DELAYED"

        existing_stmt = select(ContainerInventoryModel).where(
            ContainerInventoryModel.container_no == container_id
        )
        existing_result = await db.execute(existing_stmt)
        db_record = existing_result.scalars().first()

        if db_record:
            db_record.temperature_celsius = temp_val
            db_record.stay_duration_hours = dwell_val
            db_record.status = container_status
        else:
            db_record = ContainerInventoryModel(
                container_no=container_id,
                size="40ft",
                container_type=(
                    "Reefer" if bool(reefer_data.get("enabled", False))
                    else "Standard"
                ),
                commodity=container_data.get("cargo_class", "GENERAL"),
                temperature_celsius=temp_val,
                stay_duration_hours=dwell_val,
                status=container_status,
            )
            db.add(db_record)

        await db.commit()
        
        # Broadcast WebSocket alert if reefer anomaly condition matches
        await publish_ldb_event(payload)

        return {
            "status": "success",
            "schema_family": schema_family,
            "target": container_id,
            "routed_to": "container_inventory",
            "disruptions_active": simulation_disruptions_state
        }

    # Family 3: FOIS freight movement -> port_gate_logs (Interception for Rail Maintenance)
    elif schema_family == "mock_fois_freight_movement":
        freight_data = payload.get("freight_movement", {})
        train_id = freight_data.get("train_id", "TRAIN-UNKNOWN")
        train_status = "Processing"

        # Apply rail_maintenance disruption override if active
        if simulation_disruptions_state["rail_maintenance"]:
            train_status = "RAIL_CORRIDOR_MAINTENANCE_HALT"

        db_record = PortGateLogModel(
            vehicle_no=train_id,
            gate_id="RAIL-GATE-1",
            status=train_status,
        )
        db.add(db_record)
        await db.commit()
        return {
            "status": "success",
            "schema_family": schema_family,
            "target": train_id,
            "routed_to": "port_gate_logs",
            "disruptions_active": simulation_disruptions_state
        }

    raise HTTPException(
        status_code=400,
        detail=f"Unrecognized schema_family: '{schema_family}'",
    )


# Dual-Route Ingestion Support
@app.post(
    "/api/v1/ingest-national-stream",
    status_code=status.HTTP_201_CREATED,
)
async def ingest_national_stream(
    payload: Dict[str, Any],
    db: AsyncSession = Depends(get_db),
):
    try:
        return await process_national_stream_payload(payload, db)
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process national stream packet: {str(e)}",
        )


@app.post(
    "/api/v1/ingest-stream",
    status_code=status.HTTP_201_CREATED,
)
async def ingest_stream_alias(
    payload: Dict[str, Any],
    db: AsyncSession = Depends(get_db),
):
    try:
        return await process_national_stream_payload(payload, db)
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process national stream packet: {str(e)}",
        )