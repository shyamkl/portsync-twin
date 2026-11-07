import asyncio
import os
import json
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
from sqlalchemy.orm.attributes import flag_modified
from sqlalchemy import (
    Float, Integer, String, DateTime, Text, JSON, select, func
)

# WebSocket alert router integration
from routers.alert_router import (
    alert_router,
    alert_manager,
    detect_reefer_anomaly,
)
from routers.analytics_router import analytics_router, analytics_manager

# 1. Database connection configuration with your active MySQL credentials
DATABASE_URL = os.getenv(
    "PORTSYNC_DATABASE_URL",
    "mysql+aiomysql://root:463165Shyam@localhost:3306/portsync_twin",
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


# SQLAlchemy ORM model: system_alerts_log
class SystemAlertLogModel(Base):
    __tablename__ = "system_alerts_log"

    id: Mapped[int] = mapped_column(
        Integer, primary_key=True, autoincrement=True
    )
    alert_type: Mapped[str] = mapped_column(
        String(50), nullable=False, index=True
    )
    priority: Mapped[str] = mapped_column(
        String(20), nullable=False
    )
    source: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True
    )
    message: Mapped[str] = mapped_column(
        Text, nullable=False
    )
    container_id: Mapped[Optional[str]] = mapped_column(
        String(50), nullable=True, index=True
    )
    asset_id: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True, index=True
    )
    event_id: Mapped[Optional[str]] = mapped_column(
        String(100), nullable=True
    )
    details: Mapped[Optional[dict]] = mapped_column(
        JSON, nullable=True
    )
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="UNRESOLVED", index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, nullable=False
    )
    acknowledged_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime, nullable=True
    )
    

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


# Pydantic model for Alert Acknowledgment requests
class AlertAcknowledgeRequest(BaseModel):
    acknowledged_by: str = Field(..., description="Name or identifier of the operator acknowledging the alert")


# Global In-Memory State Dictionary for Stage 2 "What-If" Crisis Disruption Toggles
simulation_disruptions_state = {
    "customs_outage": False,
    "rail_maintenance": False,
    "gate_slowdown": False
}


# In-memory simulation targets strictly bounded within JNPT Port Viewport [18.9200 to 18.9800, 72.9000 to 73.0000]
simulated_assets_state = {
    "Vessel MV-EverGlory": {
        "lat": 18.9350, "lon": 72.9200, "speed": 14.5,
        "status": "Vessel Berthing Approach",
        "lat_dir": 0.0004, "lon_dir": 0.0006
    },
    "DFC-Train-99": {
        "lat": 18.9500, "lon": 72.9500, "speed": 65.0,
        "status": "Rail Corridor Inbound",
        "lat_dir": -0.0005, "lon_dir": 0.0003
    },
    "Truck-MH-04": {
        "lat": 18.9650, "lon": 72.9800, "speed": 42.0,
        "status": "Gate Expressway Transit",
        "lat_dir": 0.0005, "lon_dir": -0.0004
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

    if simulation_disruptions_state["gate_slowdown"]:
        processing_minutes = state["processing_minutes_slowdown"]
    else:
        processing_minutes = state["processing_minutes_normal"]

    elapsed_minutes = (
        now - state["entry_time"]
    ).total_seconds() / 60

    if elapsed_minutes >= processing_minutes:
        gate_log = await session.get(
            PortGateLogModel,
            state["active_gate_log_id"],
        )

        if gate_log is not None:
            gate_log.exit_time = now
            gate_log.status = "Completed"

        state["active_gate_log_id"] = None
        state["entry_time"] = None


# Background task: continuously animate assets within the JNPT map viewport and save telemetry every 4 seconds.
async def background_telemetry_simulator():
    while True:
        await asyncio.sleep(4)
        async with AsyncSessionLocal() as session:
            try:
                for asset_id, data in simulated_assets_state.items():
                    # Apply directional step movement
                    data["lat"] += data.get("lat_dir", 0.0004)
                    data["lon"] += data.get("lon_dir", 0.0004)

                    # Strict boundary bouncing check within [18.9200 to 18.9800] and [72.9000 to 73.0000]
                    if data["lat"] > 18.9780 or data["lat"] < 18.9220:
                        data["lat_dir"] *= -1
                    if data["lon"] > 72.9980 or data["lon"] < 72.9020:
                        data["lon_dir"] *= -1

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
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    sim_task = asyncio.create_task(background_telemetry_simulator())
    analytics_task = asyncio.create_task(background_analytics_publisher())

    try:
        yield
    finally:
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
    version="2.6.0",
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

# Register Routers.
app.include_router(alert_router)
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


# GET /api/v1/alerts/history
@app.get("/api/v1/alerts/history")
async def get_alert_history(
    limit: int = 100,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    if limit < 1 or limit > 500:
        raise HTTPException(
            status_code=400,
            detail="Limit must be between 1 and 500.",
        )

    if offset < 0:
        raise HTTPException(
            status_code=400,
            detail="Offset cannot be negative.",
        )

    count_stmt = select(
        func.count()
    ).select_from(SystemAlertLogModel)

    total_result = await db.execute(count_stmt)
    total = total_result.scalar_one()

    alerts_stmt = (
        select(SystemAlertLogModel)
        .order_by(
            SystemAlertLogModel.created_at.desc(),
            SystemAlertLogModel.id.desc(),
        )
        .offset(offset)
        .limit(limit)
    )

    result = await db.execute(alerts_stmt)
    records = result.scalars().all()

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "alerts": [
            {
                "id": alert.id,
                "alert_type": alert.alert_type,
                "priority": alert.priority,
                "source": alert.source,
                "message": alert.message,
                "container_id": alert.container_id,
                "asset_id": alert.asset_id,
                "event_id": alert.event_id,
                "details": alert.details,
                "status": alert.status,
                "created_at": alert.created_at.isoformat(),
                "acknowledged_at": (
                    alert.acknowledged_at.isoformat()
                    if alert.acknowledged_at else None
                ),
            }
            for alert in records
        ],
    }            


# POST /api/v1/alerts/{alert_id}/acknowledge
@app.post("/api/v1/alerts/{alert_id}/acknowledge", status_code=status.HTTP_200_OK)
async def acknowledge_alert(
    alert_id: int,
    payload: AlertAcknowledgeRequest,
    db: AsyncSession = Depends(get_db),
):
    alert = await db.get(SystemAlertLogModel, alert_id)
    
    if not alert:
        raise HTTPException(
            status_code=404, 
            detail=f"System alert with ID {alert_id} not found."
        )
    
    alert.status = "ACKNOWLEDGED"
    alert.acknowledged_at = datetime.utcnow()
    
    if alert.details is None:
        alert.details = {}
    elif isinstance(alert.details, str):
        try:
            alert.details = json.loads(alert.details)
        except Exception:
            alert.details = {}
            
    alert.details["resolution_logs"] = f"Cleared by {payload.acknowledged_by}"
    flag_modified(alert, "details")
    
    await db.commit()
    await db.refresh(alert)
    
    return {
        "status": "success",
        "message": f"Alert {alert_id} successfully acknowledged.",
        "alert_id": alert_id,
        "acknowledged_by": payload.acknowledged_by,
        "acknowledged_at": alert.acknowledged_at.isoformat() if alert.acknowledged_at else None
    }


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

    previous_state = simulation_disruptions_state[key]

    if key == "gate_slowdown" and state and not previous_state:
        alert_record = SystemAlertLogModel(
            alert_type="CONGESTION_GRIDLOCK",
            priority="CRITICAL",
            source="simulation_toggle",
            message="CRITICAL: Gate slowdown activated - truck traffic is in gridlock.",
            asset_id="Truck-MH-04",
            details={
                "disruption_key": key,
                "previous_state": previous_state,
                "new_state": state,
            },
            status="UNRESOLVED",
        )

        try:
            async with AsyncSessionLocal() as session:
                session.add(alert_record)
                await session.flush()
                await session.commit()
                await session.refresh(alert_record)

        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to persist gridlock alert: {str(e)}",
            )

        simulation_disruptions_state[key] = state

        await alert_manager.broadcast({
            "type": "CONGESTION_GRIDLOCK",
            "priority": alert_record.priority,
            "source": alert_record.source,
            "asset_id": alert_record.asset_id,
            "message": alert_record.message,
            "id": alert_record.id,
            "status": alert_record.status,
            "timestamp": alert_record.created_at.isoformat(),
        })

    else:
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
        
        # Normalize/project incoming GPS coordinates into JNPT port viewport [18.9200 to 18.9800, 72.9000 to 73.0000]
        hash_val = abs(hash(registration_id))
        lat = 18.9300 + ((hash_val % 500) / 10000.0)
        lon = 72.9200 + (((hash_val // 500) % 600) / 10000.0)
        
        status_str = f"Truck {trip_data.get('movement_status', 'IN_TRANSIT')}"

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

    # Family 2: LDB container cycle -> container_inventory & asset_telemetry (Interception for Customs Outage)
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

        # Also push a vessel/container asset marker into assets_telemetry for the live map
        hash_val = abs(hash(container_id))
        vessel_lat = 18.9550 + ((hash_val % 300) / 10000.0)
        vessel_lon = 72.9300 - ((hash_val % 300) / 10000.0)
        
        vessel_telemetry = AssetTelemetryModel(
            asset_id=f"Vessel-{container_id}",
            status=f"Vessel Port ({container_data.get('cycle_status', 'BERTHED')})",
            latitude=vessel_lat,
            longitude=vessel_lon,
            speed=0.0,
            timestamp=packet_time,
        )
        db.add(vessel_telemetry)

        alert = detect_reefer_anomaly(payload)

        if alert:
            alert_record = SystemAlertLogModel(
                alert_type="REEFER_ANOMALY",
                priority=alert["priority"],
                source=alert["source"],
                message=alert["message"],
                container_id=container_id,
                event_id=(
                    str(alert["event_id"])
                    if alert.get("event_id") is not None
                    else None
                ),
                details={
                    "cargo_class": alert.get("cargo_class"),
                    "power_status": alert.get("power_status"),
                    "temperature_c": alert.get("temperature_c"),
                    "reasons": alert.get("reasons", []),
                },
                status="UNRESOLVED",
            )
            db.add(alert_record)
            await db.flush()

        await db.commit()

        if alert:
            alert["id"] = alert_record.id
            alert["status"] = alert_record.status
            await alert_manager.broadcast(alert)

        return {
            "status": "success",
            "schema_family": schema_family,
            "target": container_id,
            "routed_to": "container_inventory & assets_telemetry",
            "disruptions_active": simulation_disruptions_state
        }

    # Family 3: FOIS freight movement -> port_gate_logs & assets_telemetry (Interception for Rail Maintenance)
    elif schema_family == "mock_fois_freight_movement":
        freight_data = payload.get("freight_movement", {})
        train_id = freight_data.get("train_id", "TRAIN-UNKNOWN")
        train_status = "Processing"

        if simulation_disruptions_state["rail_maintenance"]:
            train_status = "RAIL_CORRIDOR_MAINTENANCE_HALT"

        db_record = PortGateLogModel(
            vehicle_no=train_id,
            gate_id="RAIL-GATE-1",
            status=train_status,
        )
        db.add(db_record)

        # Push a train asset marker into assets_telemetry along the DFC rail corridor
        hash_val = abs(hash(train_id))
        train_lat = 18.9420 + ((hash_val % 400) / 10000.0)
        train_lon = 72.9380 + ((hash_val % 400) / 10000.0)

        train_telemetry = AssetTelemetryModel(
            asset_id=f"Train-{train_id}",
            status=f"Rail Corridor ({freight_data.get('status', 'IN_TRANSIT')})",
            latitude=train_lat,
            longitude=train_lon,
            speed=45.0 if freight_data.get("status") == "IN_TRANSIT" else 0.0,
            timestamp=packet_time,
        )
        db.add(train_telemetry)

        await db.commit()
        return {
            "status": "success",
            "schema_family": schema_family,
            "target": train_id,
            "routed_to": "port_gate_logs & assets_telemetry",
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