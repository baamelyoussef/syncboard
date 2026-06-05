import uuid
import random
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from room_manager import manager, Client

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

COLORS = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD", "#98D8C8", "#F7DC6F"]

# view token -> room_id (separate namespace, can't join the room)
_view_tokens: dict[str, str] = {}


@app.get("/room/new")
def new_room():
    return {"roomId": str(uuid.uuid4())[:8]}


@app.get("/room/view-token/{room_id}")
def create_view_token(room_id: str):
    token = str(uuid.uuid4()).replace("-", "")[:16]
    _view_tokens[token] = room_id
    return {"viewToken": token}


@app.websocket("/ws/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str):
    await websocket.accept()

    params = dict(websocket.query_params)
    client_id = params.get("clientId", str(uuid.uuid4()))
    name = params.get("name", f"User {client_id[:4]}")
    color = params.get("color", random.choice(COLORS))

    client = Client(id=client_id, name=name, color=color, websocket=websocket)
    await manager.connect(room_id, client)

    try:
        while True:
            op = await websocket.receive_json()
            op["clientId"] = client_id
            await manager.handle_op(room_id, op)
    except WebSocketDisconnect:
        await manager.disconnect(room_id, client_id)


@app.websocket("/ws/view/{view_token}")
async def view_websocket(websocket: WebSocket, view_token: str):
    room_id = _view_tokens.get(view_token)
    if not room_id:
        await websocket.close(code=1008)
        return

    await websocket.accept()

    # Send current state then keep alive — read only, never broadcast ops back
    room = manager._rooms.get(room_id)
    await websocket.send_json({
        "type": "INIT",
        "ops": room.ops if room else [],
        "peers": [],
        "readOnly": True,
    })

    try:
        while True:
            # Drain any messages from client but ignore them all
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
