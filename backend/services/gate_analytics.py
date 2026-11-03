
from datetime import datetime
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from main import AssetTelemetryModel, PortGateLogModel


async def get_gate_analytics(session: AsyncSession) -> dict[str, Any]:
    """
    Return database record counts and rolling averages
    for the latest 10 completed truck gate records.
    """

    # 1. Count all port gate log records.
    gate_count_result = await session.execute(
        select(func.count()).select_from(PortGateLogModel)
    )
    gate_log_count = gate_count_result.scalar_one()

    # 2. Count all asset telemetry records.
    telemetry_count_result = await session.execute(
        select(func.count()).select_from(AssetTelemetryModel)
    )
    telemetry_count = telemetry_count_result.scalar_one()

    # 3. Fetch the latest 10 completed truck records.
    # Exclude FOIS train records stored at RAIL-GATE-1.
    completed_trucks_result = await session.execute(
        select(PortGateLogModel)
        .where(
            PortGateLogModel.exit_time.is_not(None),
            PortGateLogModel.vehicle_no.like("Truck-%"),
            PortGateLogModel.gate_id != "RAIL-GATE-1",
        )
        .order_by(
            PortGateLogModel.exit_time.desc(),
            PortGateLogModel.id.desc(),
        )
        .limit(10)
    )

    completed_trucks = list(
        reversed(completed_trucks_result.scalars().all())
    )

    # 4. Calculate cumulative averages across the returned records.
    rolling_average_minutes = []
    processing_durations = []

    for truck in completed_trucks:
        duration_seconds = (
            truck.exit_time - truck.entry_time
        ).total_seconds()

        processing_minutes = round(duration_seconds / 60, 2)
        processing_durations.append(processing_minutes)

        rolling_average = round(
            sum(processing_durations[-10:]) /
            len(processing_durations[-10:]),
            2,
        )

        rolling_average_minutes.append({
            "vehicle_no": truck.vehicle_no,
            "gate_id": truck.gate_id,
            "processing_minutes": processing_minutes,
            "rolling_average": rolling_average,
            "exit_time": truck.exit_time.isoformat(),
        })

    return {
        "type": "GATE_QUEUE_ANALYTICS",
        "gate_log_count": gate_log_count,
        "telemetry_count": telemetry_count,
        "rolling_average_minutes": rolling_average_minutes,
        "timestamp": datetime.utcnow().isoformat(),
    }
