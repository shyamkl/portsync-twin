import asyncio
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

analytics_router = APIRouter(tags=["Live Analytics"])


class AnalyticsConnectionManager:
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

    async def broadcast(self, payload: dict):
        async with self.lock:
            connections = list(self.active_connections)

        stale_connections = []

        for connection in connections:
            try:
                await connection.send_json(payload)
            except Exception:
                stale_connections.append(connection)

        if stale_connections:
            async with self.lock:
                for connection in stale_connections:
                    self.active_connections.discard(connection)


analytics_manager = AnalyticsConnectionManager()


#@analytics_router.get("/api/v1/analytics/summary")
#async def analytics_summary(
#    db: AsyncSession = Depends(get_db),
#):
#    return await get_gate_analytics(db)


@analytics_router.websocket("/ws/analytics")
async def analytics_websocket(websocket: WebSocket):
    await analytics_manager.connect(websocket)

    try:
        while True:
            await websocket.send_json({
                "type": "GATE_QUEUE_ANALYTICS",
                "message": "Connected to PortSync live analytics",
            })

            await asyncio.sleep(10)

    except WebSocketDisconnect:
        await analytics_manager.disconnect(websocket)
    except Exception:
        await analytics_manager.disconnect(websocket)
