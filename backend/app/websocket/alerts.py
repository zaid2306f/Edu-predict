from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.websocket.manager import manager
router=APIRouter()
@router.websocket('/ws/alerts')
async def alerts_socket(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True: await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
