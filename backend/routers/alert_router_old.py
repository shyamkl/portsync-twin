
import asyncio
import json
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

alert_router = APIRouter(tags=["Live Alerts"])


class AlertConnectionManager:
    """Tracks active WebSocket clients."""

    def __init__(self):
        self.active_connections: set[WebSocket] = set()
        self.lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        async with self.lock:
            self.active_connections.add(websocket)

    async def disconnect(self, websocket: WebSocket):
        async with self.lock:
            self.active_connections.discard(websocket)

    async def broadcast(self, payload: dict[str, Any]):
        # Snapshot avoids holding the lock during network I/O.
        async with self.lock:
            clients = list(self.active_connections)

        message = json.dumps(payload, default=str)
        stale_clients = []

        # Concurrent sends: one slow client shouldn't delay
        # sending to the other clients.
        async def send(client: WebSocket):
            try:
                await client.send_text(message)
                return None
            except Exception:
                return client

        results = await asyncio.gather(
            *(send(client) for client in clients)
        )

        stale_clients = [
            client for client in results if client is not None
        ]

        if stale_clients:
            async with self.lock:
                for client in stale_clients:
                    self.active_connections.discard(client)


alert_manager = AlertConnectionManager()


def detect_reefer_anomaly(event: dict) -> dict | None:
    """Return a critical alert if the event has a reefer anomaly."""

    # Expected event shape; adjust to actual generator schema.
    container = event.get("container", event)
    reefer = container.get("reefer") or {}

    cargo_class = container.get(
        "cargo_class", event.get("cargo_class")
    )

    if cargo_class != "PHARMA":
        return None

    power_status = reefer.get("power_status")
    temperature = reefer.get("temperature_c")

    reasons = []

    if power_status == "INTERRUPTED":
        reasons.append("REEFER_POWER_INTERRUPTED")

    if temperature is not None:
        try:
            if float(temperature) > 8.0:
                reasons.append("REEFER_TEMPERATURE_HIGH")
        except (TypeError, ValueError):
            pass

    if not reasons:
        return None

    container_id = container.get(
        "container_id",
        event.get("container_id", "UNKNOWN")
    )

    return {
        "type": "TRIAGE_ALERT",
        "priority": "CRITICAL",
        "source": "mock_ldb_container_cycle",
        "container_id": container_id,
        "cargo_class": cargo_class,
        "power_status": power_status,
        "temperature_c": temperature,
        "reasons": reasons,
        "message": (
            f"CRITICAL: PHARMA reefer anomaly - "
            f"container {container_id}: {', '.join(reasons)}"
        ),
        "event_id": event.get("event_id"),
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


async def publish_ldb_event(event: dict):
    """
    Call from the LDB ingestion path for each incoming event.
    """
    if event.get("event_type") not in (
        None, "mock_ldb_container_cycle"
    ):
        return

    alert = detect_reefer_anomaly(event)

    if alert:
        await alert_manager.broadcast(alert)


@alert_router.websocket("/ws/alerts")
async def websocket_alert_endpoint(websocket: WebSocket):
    await alert_manager.connect(websocket)

    try:
        # Keep connection alive. Client can send a ping.
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    except Exception:
        pass
    finally:
        await alert_manager.disconnect(websocket)
